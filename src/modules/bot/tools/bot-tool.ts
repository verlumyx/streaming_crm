import { z } from 'zod';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import type { EmbeddingModel, ToolDeclaration } from '../infrastructure/ai-ports';
import type { BotSettingsRow } from '../models/bot-settings.model';

/**
 * Everything a tool is allowed to know. `companyId`, `contactId` and `clientId` come from the
 * event being processed, NEVER from the model's arguments — that is what makes a prompt-injection
 * attempt like "consulta la empresa X" structurally impossible rather than merely discouraged.
 */
export type ToolContext = {
  db: DbExecutor;
  embeddings: EmbeddingModel;
  companyId: string;
  botUserId: string;
  conversationId: string;
  contactId: string;
  /**
   * Mutable within a turn: `registrar_cliente` sets it so a `crear_venta` call later in the same
   * turn sees the client that was just created. Still never settable from the model's arguments.
   */
  clientId: string | null;
  contactPhoneE164: string | null;
  settings: BotSettingsRow;
  today: string;
};

/** What a tool returns to the model. Always a plain object, never a thrown error. */
export type ToolResult = Record<string, unknown>;

export interface BotTool<S extends z.ZodType = z.ZodType> {
  readonly name: string;
  readonly description: string;
  readonly schema: S;
  /** Mutating tools run inside their own transaction, opened by the runner. */
  readonly mutating: boolean;
  execute(args: z.infer<S>, context: ToolContext): Promise<ToolResult>;
}

/**
 * Zod 4 → Gemini's function declaration. Gemini accepts an OpenAPI 3.0 subset and rejects the
 * JSON Schema keywords Zod emits, so they are stripped here. One schema, used both to declare the
 * tool and to validate what comes back.
 */
export function toDeclaration(tool: BotTool): ToolDeclaration {
  const schema = z.toJSONSchema(tool.schema, { io: 'input' }) as Record<string, unknown>;

  return {
    name: tool.name,
    description: tool.description,
    parameters: sanitizeForGemini(schema),
  };
}

const UNSUPPORTED_KEYWORDS = new Set([
  '$schema',
  '$ref',
  '$defs',
  'additionalProperties',
  'const',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'patternProperties',
]);

export function sanitizeForGemini(value: unknown): Record<string, unknown> {
  return clean(value) as Record<string, unknown>;
}

function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value === null || typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (UNSUPPORTED_KEYWORDS.has(key)) continue;
    out[key] = clean(child);
  }
  return out;
}
