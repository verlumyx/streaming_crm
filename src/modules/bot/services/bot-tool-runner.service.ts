import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { DomainError } from '@/modules/shared/exceptions/domain-error';
import type { BotTool, ToolContext, ToolResult } from '../tools/bot-tool';

/** A tool result serialized into the prompt is truncated to this, so one query cannot flood it. */
const MAX_RESULT_CHARS = 4000;

export type ToolRun = { name: string; args: Record<string, unknown>; result: ToolResult };

/**
 * Executes what the model asked for.
 *
 * Never throws for an expected failure: an unknown tool, bad arguments or a business rule all come
 * back as `{ error }` so the model can apologise or ask again. A genuine bug still propagates and
 * sends the event back to the queue.
 */
export class BotToolRunner {
  private readonly byName: Map<string, BotTool>;

  constructor(
    tools: BotTool[],
    /** Mutating tools get their own transaction; the caller's executor is used for reads. */
    private readonly runInTransaction: <T>(work: (tx: DbExecutor) => Promise<T>) => Promise<T>,
  ) {
    this.byName = new Map(tools.map((tool) => [tool.name, tool]));
  }

  async run(name: string, rawArgs: Record<string, unknown>, context: ToolContext): Promise<ToolRun> {
    const tool = this.byName.get(name);
    if (!tool) {
      return { name, args: rawArgs, result: { error: 'herramienta_no_disponible' } };
    }

    const parsed = tool.schema.safeParse(rawArgs);
    if (!parsed.success) {
      return {
        name,
        args: rawArgs,
        result: {
          error: 'argumentos_invalidos',
          detalle: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'args'}: ${issue.message}`),
        },
      };
    }

    try {
      let result: ToolResult;

      if (tool.mutating) {
        // The tool runs against its own transaction, so it gets a copy of the context. Anything it
        // resolves for the rest of the turn (the client it just registered) is copied back.
        const scoped: ToolContext = { ...context, db: undefined as never };
        result = await this.runInTransaction((tx) => {
          scoped.db = tx;
          return tool.execute(parsed.data, scoped);
        });
        context.clientId = scoped.clientId;
      } else {
        result = await tool.execute(parsed.data, context);
      }

      return { name, args: parsed.data as Record<string, unknown>, result: truncate(result) };
    } catch (error) {
      if (error instanceof DomainError) {
        return { name, args: parsed.data as Record<string, unknown>, result: { error: error.message } };
      }
      throw error;
    }
  }
}

function truncate(result: ToolResult): ToolResult {
  const serialized = JSON.stringify(result);
  if (serialized.length <= MAX_RESULT_CHARS) return result;

  return { truncado: true, contenido: serialized.slice(0, MAX_RESULT_CHARS) };
}
