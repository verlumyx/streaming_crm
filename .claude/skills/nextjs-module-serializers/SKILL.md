---
name: nextjs-module-serializers
description: "Guide for creating serializers (to{Module}Dto) in the modular Next.js architecture. Activates when creating or modifying files inside any module's serializers/ folder, when a Server Component passes data to a client component, or when a Server Action returns data to the UI."
license: MIT
metadata:
  author: project
---

# Next.js Module — Serializers

Serializers transform Drizzle rows into JSON-safe DTOs. **Never expose the raw row** to a client component, to a Server Action result, or to any consumer outside the server.

## Location

```
src/modules/{module-name}/serializers/
└── {module-name}.serializer.ts     exports type {Module}Dto + to{Module}Dto(row)
```

## Rules

1. Always export an explicit `type {Module}Dto` next to `to{Module}Dto`. The DTO type **is** the entity type the UI imports (`import type { ClientDto } from '@/modules/client/serializers/client.serializer'`). `ui/types/` must not duplicate it — it only holds `Filters`/`Meta`.
2. List every field explicitly — never `...row` spread. A new column is exposed only when a serializer line is added.
3. Never expose internal implementation details (raw join columns, internal flags, `deletedAt`, `createdBy` ids the UI does not need).
4. DTOs are JSON-safe: dates → `toISOString()` (`string`), never `Date`; no class instances; no `bigint`; `numeric`/`decimal` columns arrive as `string` from Drizzle — convert with `Number(...)` for amounts the UI computes with, keep the `string` when precision matters (money that is only displayed, quantities with more than 2 decimals) and say so in the type.
5. Relations are **optional DTO fields populated only when the repository joined/loaded them**. The serializer never queries.
6. Serializers run in pages (before rendering a `ui/` client component) and in Server Actions when an action returns data. Collections are `rows.map(to{Module}Dto)`.
7. Enums/status columns are exposed as their string literal union (`'active' | 'inactive'`), exactly as typed in the model.

---

## {Module}Serializer

```ts
// src/modules/client/serializers/client.serializer.ts
import type { ClientRow } from '../models/client.model';

export type ClientDto = {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;         // ISO 8601 — the UI formats it for display
  updatedAt: string | null;
};

export function toClientDto(row: ClientRow): ClientDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}
```

---

## With Relationships

A relation is an optional field, present only when the repository loaded it. Two accepted shapes:

**Optional second argument** for a single relation the repository sometimes joins:

```ts
import type { CompanyRow } from '@/modules/company/models/company.model';
import { toCompanyDto, type CompanyDto } from '@/modules/company/serializers/company.serializer';

export type ClientDto = {
  // ...fields above
  company?: CompanyDto;
};

export function toClientDto(row: ClientRow, relations: { company?: CompanyRow } = {}): ClientDto {
  return {
    // ...fields above
    ...(relations.company ? { company: toCompanyDto(relations.company) } : {}),
  };
}
```

**Dedicated function** for a nested shape returned by a relational query. Example: a `Sale` with its `saleProfiles`, each carrying the `profile` and the profile's `account` (`db.query.sales.findFirst({ with: { saleProfiles: { with: { profile: { with: { account: true } } } } } })` in the repository):

```ts
// src/modules/sale/serializers/sale.serializer.ts
import type { SaleRow } from '../models/sale.model';
import type { SaleProfileRow } from '../models/sale-profile.model';
import type { ProfileRow } from '@/modules/profile/models/profile.model';
import type { AccountRow } from '@/modules/account/models/account.model';

export type SaleWithProfilesRow = SaleRow & {
  saleProfiles: Array<SaleProfileRow & { profile: ProfileRow & { account: AccountRow } }>;
};

export type SaleProfileDto = {
  id: string;
  profileId: string;
  profile: { id: string; name: string; account: { id: string; email: string; platform: string } };
};

export type SaleDto = {
  id: string;
  clientId: string;
  price: number;            // numeric(12,2) → Number(); safe for totals in the UI
  startsAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'cancelled';
  daysUntilExpiration: number; // simple derived display field — documented, no business decision
  saleProfiles?: SaleProfileDto[];
};

export function toSaleDto(row: SaleRow): SaleDto {
  return {
    id: row.id,
    clientId: row.clientId,
    price: Number(row.price),
    startsAt: row.startsAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    status: row.status,
    daysUntilExpiration: Math.ceil((row.expiresAt.getTime() - Date.now()) / 86_400_000),
  };
}

export function toSaleWithProfilesDto(row: SaleWithProfilesRow): SaleDto {
  return {
    ...toSaleDto(row),
    saleProfiles: row.saleProfiles.map((sp) => ({
      id: sp.id,
      profileId: sp.profileId,
      profile: {
        id: sp.profile.id,
        name: sp.profile.name,
        account: { id: sp.profile.account.id, email: sp.profile.account.email, platform: sp.profile.account.platform },
      },
    })),
  };
}
```

---

## Usage in Pages and Actions

```tsx
// Single — Ver page
const row = await createClientContainer(db).findService.execute(id, companyId);
return <ClientCard companyId={companyId} client={toClientDto(row)} />;

// Collection — Listar page
const { data, total } = await createClientContainer(db).searchService.execute(command);
return <ClientList companyId={companyId} items={data.map(toClientDto)} meta={{ total, limit, offset, hasMore }} filters={filters} />;

// Server Action that returns data (rare — most actions redirect)
return { status: 'idle', data: toClientDto(row) };
```

---

## Enum Values

`status` is a `varchar` narrowed with `$type<...>()` in the model, so the row already carries the string literal. Copy it through unchanged and mirror the same union in the DTO type. If a value ever needs remapping for the UI, do it in the UI, not here.

---

## Do NOT

```tsx
// ❌ Never pass a Drizzle row to a client component (Date + non-serializable fields cross the boundary)
return <ClientList items={data} />;

// ❌ Never format dates for display in the serializer — the UI owns formatting/locale
createdAt: format(row.createdAt, 'dd/MM/yyyy'),

// ❌ Never spread the row — every column leaks automatically
return { ...row, createdAt: row.createdAt.toISOString() };

// ❌ Never compute business decisions here (belongs to the Service / domain rules)
canBeRenewed: row.status === 'expired' && daysSince(row.expiresAt) <= gracePeriodDays,
```

Simple derived **display** fields (`daysUntilExpiration`, `fullName`) are acceptable when documented with a comment; anything that decides what the user may do is business logic and lives in the Service.
