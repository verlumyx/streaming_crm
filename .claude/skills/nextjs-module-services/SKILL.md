---
name: nextjs-module-services
description: "Guide for creating Service classes in the modular Next.js architecture. Activates when creating or modifying {module-name}-create.service.ts, {module-name}-update.service.ts, {module-name}-update-status.service.ts, {module-name}-find.service.ts or {module-name}-search.service.ts inside any module's src/modules/{module-name}/services/ folder."
license: MIT
metadata:
  author: project
---

# Next.js Module — Services

Services contain **all business logic**. One Service per use case. They receive a Command and delegate persistence to the repository interface. They are plain TypeScript classes with no framework dependency, which is what makes them unit-testable in plain Node.

## Location

```
src/modules/{module-name}/services/
├── {module-name}-create.service.ts           ← {Module}CreateService
├── {module-name}-update.service.ts           ← {Module}UpdateService
├── {module-name}-update-status.service.ts    ← {Module}UpdateStatusService
├── {module-name}-find.service.ts             ← {Module}FindService
└── {module-name}-search.service.ts           ← {Module}SearchService
```

For the `Client` module: `client-create.service.ts` exporting `ClientCreateService`, and so on.

## Rules

1. **One Service per action** — never combine use cases in a single service.
2. Always receive the **repository interface** (`ClientRepository`) via constructor, never the concrete `DrizzleClientRepository`.
3. The only public method is `execute()`. It is always `async` and returns the Drizzle row (`ClientRow`) or `{ data, total }` — serialization to a DTO happens in the page/action layer, never here.
4. Throw domain exceptions (`ClientNotFoundException`, `ClientAlreadyExistsException`) for every failure — never return `null`, `false` or an error object.
5. Never import `@/db`, `drizzle-orm`, or any `Drizzle*Repository` inside a Service — data access goes through the interface.
6. Never import `next/headers`, `next/navigation`, `next/cache`, `server-only`, and never touch `FormData` or the request — a Service only receives Commands and plain arguments. It must run unchanged inside a Vitest unit test with no Next.js runtime.
7. Services **never open transactions**. The action opens `db.transaction(async (tx) => ...)` and passes `tx` through `create{Module}Container(tx)`; the service is unaware of whether it runs inside one.
8. Services are wired only in `container.ts`. Pages and actions get them from `create{Module}Container(db | tx)` — they never call `new ClientCreateService(...)` themselves.

---

## ClientCreateService

`repository.create()` returns `void` — after persisting, fetch the row with `findOrFail(command.id, command.companyId)`.

```ts
// services/client-create.service.ts
import type { ClientRepository } from '../repositories/client.repository';
import type { CreateClientCommand } from '../commands/create-client.command';
import type { ClientRow } from '../models/client.model';

export class ClientCreateService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(command: CreateClientCommand): Promise<ClientRow> {
    await this.repository.create(command);

    return this.repository.findOrFail(command.id, command.companyId);
  }
}
```

---

## ClientUpdateService

`id` and `companyId` arrive as explicit arguments (bound by the action from the URL); the Command carries only the editable fields.

```ts
// services/client-update.service.ts
import type { ClientRepository } from '../repositories/client.repository';
import type { UpdateClientCommand } from '../commands/update-client.command';
import type { ClientRow } from '../models/client.model';
import { ClientNotFoundException } from '../exceptions/client-not-found.exception';

export class ClientUpdateService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(id: string, companyId: string, command: UpdateClientCommand): Promise<ClientRow> {
    const row = await this.repository.findById(id, companyId);

    if (!row) {
      throw new ClientNotFoundException(id);
    }

    await this.repository.update(row, command);

    return this.repository.findOrFail(id, companyId);
  }
}
```

---

## ClientUpdateStatusService

```ts
// services/client-update-status.service.ts
import type { ClientRepository } from '../repositories/client.repository';
import type { UpdateStatusClientCommand } from '../commands/update-status-client.command';
import type { ClientRow } from '../models/client.model';
import { ClientNotFoundException } from '../exceptions/client-not-found.exception';

export class ClientUpdateStatusService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(id: string, companyId: string, command: UpdateStatusClientCommand): Promise<ClientRow> {
    const row = await this.repository.findById(id, companyId);

    if (!row) {
      throw new ClientNotFoundException(id);
    }

    await this.repository.updateStatus(row, command);

    return this.repository.findOrFail(id, companyId);
  }
}
```

---

## ClientFindService

```ts
// services/client-find.service.ts
import type { ClientRepository } from '../repositories/client.repository';
import type { ClientRow } from '../models/client.model';
import { ClientNotFoundException } from '../exceptions/client-not-found.exception';

export class ClientFindService {
  constructor(private readonly repository: ClientRepository) {}

  async execute(id: string, companyId: string): Promise<ClientRow> {
    const row = await this.repository.findById(id, companyId);

    if (!row) {
      throw new ClientNotFoundException(id);
    }

    return row;
  }
}
```

---

## ClientSearchService

```ts
// services/client-search.service.ts
import type { ClientRepository } from '../repositories/client.repository';
import type { SearchClientCommand } from '../commands/search-client.command';
import type { ClientRow } from '../models/client.model';

export class ClientSearchService {
  constructor(private readonly repository: ClientRepository) {}

  execute(command: SearchClientCommand): Promise<{ data: ClientRow[]; total: number }> {
    return this.repository.search(command);
  }
}
```

The `companyId` used for scoping is already inside `SearchClientCommand` (required) — the service does not add it and does not know where it came from.

---

## Adding Business Logic

Additional business logic goes inside `execute()`, between receiving the command and calling the repository. Rules read data through the interface and fail by throwing a domain exception.

### Uniqueness check

```ts
// services/client-create.service.ts
import { ClientAlreadyExistsException } from '../exceptions/client-already-exists.exception';

async execute(command: CreateClientCommand): Promise<ClientRow> {
  // ✅ Business rules here — always scoped to the company of the command
  if (await this.repository.existsByName(command.name, command.companyId)) {
    throw new ClientAlreadyExistsException(command.name);
  }

  await this.repository.create(command);

  return this.repository.findOrFail(command.id, command.companyId);
}
```

`existsByName(name, companyId)` is added to the interface first, then to the Drizzle implementation and to the fake (see `nextjs-module-repositories`). The exception extends `DomainError`, so the action's `toActionError()` turns it into a Spanish toast: `'Ya existe un cliente con el nombre "Ana".'`.

### Composing another module's repository

When a rule needs data from another module, inject that module's **interface** as a second constructor argument. The service still knows nothing about Drizzle.

```ts
// src/modules/sale/services/sale-create.service.ts
import type { SaleRepository } from '../repositories/sale.repository';
import type { ClientRepository } from '@/modules/client/repositories/client.repository';
import type { CreateSaleCommand } from '../commands/create-sale.command';
import type { SaleRow } from '../models/sale.model';
import { ClientNotFoundException } from '@/modules/client/exceptions/client-not-found.exception';
import { ClientInactiveException } from '@/modules/client/exceptions/client-inactive.exception';

export class SaleCreateService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly clientRepository: ClientRepository,
  ) {}

  async execute(command: CreateSaleCommand): Promise<SaleRow> {
    const client = await this.clientRepository.findById(command.clientId, command.companyId);
    if (!client) throw new ClientNotFoundException(command.clientId);
    if (client.status !== 'active') throw new ClientInactiveException(client.id);

    await this.repository.create(command);

    return this.repository.findOrFail(command.id, command.companyId);
  }
}
```

The wiring happens in the consuming module's container, taking the other module's repository from its public container — never by importing `DrizzleClientRepository`:

```ts
// src/modules/sale/container.ts
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { createClientContainer } from '@/modules/client/container';
import { DrizzleSaleRepository } from './repositories/drizzle-sale.repository';
import { SaleCreateService } from './services/sale-create.service';

export function createSaleContainer(db: DbExecutor) {
  const repository = new DrizzleSaleRepository(db);
  const { repository: clientRepository } = createClientContainer(db); // same db | tx

  return {
    repository,
    createService: new SaleCreateService(repository, clientRepository),
    // ...
  };
}
```

Because both repositories receive the same `DbExecutor`, they share the action's transaction automatically.

---

## Unit Testing (Vitest, no database)

Every service gets a unit test in `tests/unit/modules/{module-name}/`. The service is instantiated with an in-memory fake that implements the repository interface — no Drizzle, no Next.js, no mocks of framework modules needed.

### FakeClientRepository

```ts
// tests/unit/modules/client/fake-client.repository.ts
import type { ClientRepository } from '@/modules/client/repositories/client.repository';
import type { ClientRow } from '@/modules/client/models/client.model';
import type { CreateClientCommand } from '@/modules/client/commands/create-client.command';
import type { UpdateClientCommand } from '@/modules/client/commands/update-client.command';
import type { UpdateStatusClientCommand } from '@/modules/client/commands/update-status-client.command';
import type { SearchClientCommand } from '@/modules/client/commands/search-client.command';
import { ClientNotFoundException } from '@/modules/client/exceptions/client-not-found.exception';

export class FakeClientRepository implements ClientRepository {
  rows: ClientRow[] = [];

  async create(command: CreateClientCommand): Promise<void> {
    this.rows.push({
      id: command.id,
      companyId: command.companyId,
      name: command.name,
      status: 'active',
      createdAt: new Date(),
      updatedAt: null,
    });
  }

  async findById(id: string, companyId: string): Promise<ClientRow | null> {
    return this.rows.find((row) => row.id === id && row.companyId === companyId) ?? null;
  }

  async findOrFail(id: string, companyId: string): Promise<ClientRow> {
    const row = await this.findById(id, companyId);
    if (!row) throw new ClientNotFoundException(id);
    return row;
  }

  async update(row: ClientRow, command: UpdateClientCommand): Promise<void> {
    Object.assign(row, { name: command.name, updatedAt: new Date() });
  }

  async updateStatus(row: ClientRow, command: UpdateStatusClientCommand): Promise<void> {
    Object.assign(row, { status: command.status, updatedAt: new Date() });
  }

  async search(command: SearchClientCommand): Promise<{ data: ClientRow[]; total: number }> {
    const scoped = this.rows.filter((row) => row.companyId === command.companyId);
    return { data: scoped.slice(command.offset, command.offset + command.limit), total: scoped.length };
  }

  async existsByName(name: string, companyId: string): Promise<boolean> {
    return this.rows.some((row) => row.name === name && row.companyId === companyId);
  }
}
```

The `rows` array is public on purpose: tests seed it with `repository.rows.push(...)` and assert on it after `execute()`.

### Service tests

```ts
// tests/unit/modules/client/client-update-status.service.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { ClientUpdateStatusService } from '@/modules/client/services/client-update-status.service';
import { UpdateStatusClientCommand } from '@/modules/client/commands/update-status-client.command';
import { ClientNotFoundException } from '@/modules/client/exceptions/client-not-found.exception';
import { FakeClientRepository } from './fake-client.repository';

const COMPANY_ID = '0192f3a0-0000-7000-8000-00000000c001';
const CLIENT_ID = '0192f3a0-0000-7000-8000-000000000001';

describe('ClientUpdateStatusService', () => {
  let repository: FakeClientRepository;
  let service: ClientUpdateStatusService;

  beforeEach(() => {
    repository = new FakeClientRepository();
    service = new ClientUpdateStatusService(repository);
    repository.rows.push({
      id: CLIENT_ID,
      companyId: COMPANY_ID,
      name: 'Ana',
      status: 'active',
      createdAt: new Date(),
      updatedAt: null,
    });
  });

  it('deactivates the client', async () => {
    const result = await service.execute(CLIENT_ID, COMPANY_ID, new UpdateStatusClientCommand('inactive'));

    expect(result.status).toBe('inactive');
    expect(repository.rows[0].status).toBe('inactive');
  });

  it('throws when the client belongs to another company', async () => {
    await expect(
      service.execute(CLIENT_ID, '0192f3a0-0000-7000-8000-00000000c002', new UpdateStatusClientCommand('inactive')),
    ).rejects.toBeInstanceOf(ClientNotFoundException);
  });
});
```

Minimum cases per service: the happy path, the `NotFoundException` path (unknown id **and** wrong company), and one test per business rule added to `execute()` (e.g. `ClientAlreadyExistsException` when `existsByName` is true).
