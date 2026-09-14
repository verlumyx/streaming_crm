---
name: nextjs-module-exceptions
description: "Guide for creating domain exception classes in the modular Next.js architecture. Activates when creating or modifying *.exception.ts files inside any module's exceptions/ folder, the shared src/modules/shared/exceptions/domain-error.ts, or when deciding how a server action or page should handle an error thrown by a Service."
license: MIT
metadata:
  author: project
---

# Next.js Module — Exceptions

Custom exceptions represent domain-specific error conditions. They are thrown by Services (and by `findOrFail` in repositories) and caught by the server action (`toActionError()`) or the page (`notFound()`).

## Location

```
src/modules/shared/exceptions/
└── domain-error.ts                          DomainError, NotFoundError, ForbiddenError

src/modules/{module-name}/exceptions/
└── {module-name}-not-found.exception.ts     {Module}NotFoundException
```

## Rules

1. Always extend `DomainError` (or one of its shared subclasses, `NotFoundError`). Never throw a plain `Error` for an expected domain failure — `toActionError()` rethrows anything that is not a `DomainError`.
2. Always set a clear **default message in Spanish** — it is the text the user sees in the toast.
3. Do not add logic to exceptions — they are signal objects only.
4. One file per exception, named after what went wrong: `{module-name}-not-found.exception.ts`, `{module-name}-already-exists.exception.ts`, `{module-name}-inactive.exception.ts`.
5. Never catch-and-swallow a domain exception inside a Service. Services throw; actions and pages decide.

---

## Shared base classes

```ts
// src/modules/shared/exceptions/domain-error.ts
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Recurso no encontrado.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(readonly action: string) {
    super(`No tienes permiso para realizar la acción ${action}.`);
    this.name = 'ForbiddenError';
  }
}
```

`instanceof` works across the hierarchy (the project targets ES2017+, so no prototype fix-up is needed). `ForbiddenError` is thrown only by `requirePermission()`; modules never throw it directly.

---

## {Module}NotFoundException

```ts
// src/modules/client/exceptions/client-not-found.exception.ts
import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class ClientNotFoundException extends NotFoundError {
  constructor(id?: string) {
    super(id ? `Cliente ${id} no encontrado.` : 'Cliente no encontrado.');
    this.name = 'ClientNotFoundException';
  }
}
```

Extending `NotFoundError` keeps it a `DomainError` (actions map it to a message) and lets pages catch every "not found" generically.

---

## Common Exception Types

Add only the exceptions that the module actually needs:

```ts
// Record not found
export class ClientNotFoundException extends NotFoundError {
  constructor(id?: string) {
    super(id ? `Cliente ${id} no encontrado.` : 'Cliente no encontrado.');
    this.name = 'ClientNotFoundException';
  }
}

// Duplicate record
export class ClientAlreadyExistsException extends DomainError {
  constructor(message = 'Ya existe un cliente con esos datos.') {
    super(message);
    this.name = 'ClientAlreadyExistsException';
  }
}

// Invalid state
export class ClientInactiveException extends DomainError {
  constructor(message = 'El cliente está inactivo y no admite esta operación.') {
    super(message);
    this.name = 'ClientInactiveException';
  }
}
```

---

## Where Exceptions Are Thrown

Exceptions are thrown in Services and in the repository's `findOrFail`, never in pages, actions or UI components:

```ts
// ✅ In Service
async execute(id: string, companyId: string): Promise<ClientRow> {
  const row = await this.repository.findById(id, companyId);
  if (!row) throw new ClientNotFoundException(id);
  return row;
}
```

```ts
// ✅ In Repository — the only repository method that throws a domain exception
async findOrFail(id: string, companyId: string): Promise<ClientRow> {
  const row = await this.findById(id, companyId);
  if (!row) throw new ClientNotFoundException(id);
  return row;
}
```

---

## Where Exceptions Are Caught

### Server actions → `toActionError()`

Every action wraps permission + validation + service in one `try/catch` and delegates to `toActionError` from `@/modules/shared/actions/action-state`:

- `ForbiddenError` → `{ status: 'error', message: 'No tienes permiso para realizar esta acción.' }` (fixed text, the action never customizes it).
- Any other `DomainError` → `{ status: 'error', message: error.message }` — the Spanish default message is shown as a toast.
- Anything else (bugs, database failures) is **rethrown** so the Next.js error boundary shows it and it gets logged. Never map unknown errors to a friendly message.

```ts
try {
  await requirePermission(companyId, 'clients.update');
  // validate, build the command, run the service inside db.transaction(...)
} catch (error) {
  return toActionError(error);
}
// revalidatePath / setFlash / redirect go here, outside the try
```

### Pages → `notFound()`

Ver and Editar pages catch the module's not-found exception (or `NotFoundError`) and call `notFound()`; everything else propagates:

```tsx
try {
  const row = await createClientContainer(db).findService.execute(id, companyId);
  return <ClientCard companyId={companyId} client={toClientDto(row)} />;
} catch (error) {
  if (error instanceof ClientNotFoundException) notFound();
  throw error;
}
```

`ForbiddenError` never reaches a page: `guardPage()` redirects before any Service runs. Pages never call `toActionError()`.

### Tests

Unit tests assert the exception type, never the message text:

```ts
await expect(service.execute(missingId, companyId)).rejects.toBeInstanceOf(ClientNotFoundException);
```
