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
  /**
   * Bolívares per dollar the turn may price with, or `null` when there is none or the stored one
   * went stale. Resolved once per turn so every tool quotes the same rate, and so the model never
   * has to multiply: the bolívar amounts it says come from here, like every other number.
   */
  exchangeRate: number | null;
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
 * Zod 4 → a provider-agnostic function declaration. The JSON Schema goes out untouched: narrowing
 * it is each adapter's job, because what Gemini rejects is part of what OpenAI needs. One schema,
 * used both to declare the tool and to validate what comes back.
 */
export function toDeclaration(tool: BotTool): ToolDeclaration {
  return {
    name: tool.name,
    description: tool.description,
    parameters: z.toJSONSchema(tool.schema, { io: 'input' }) as Record<string, unknown>,
  };
}
