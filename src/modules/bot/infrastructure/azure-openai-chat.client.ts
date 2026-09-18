import 'server-only';
import type {
  ChatFunctionCall,
  ChatModel,
  ChatPart,
  ChatRequest,
  ChatResult,
  ChatTurn,
} from './ai-ports';
import { AiUnavailableException } from '../exceptions/ai-unavailable.exception';

/**
 * Azure OpenAI chat against the `/openai/v1` surface, which speaks the plain OpenAI protocol: no
 * `api-version`, no `/deployments/{name}` in the path — the deployment travels as `model`. Called
 * with `fetch` instead of the `openai` SDK so the bot keeps its dependency list untouched.
 */
export class AzureOpenAiChatModel implements ChatModel {
  private readonly endpoint: string;

  constructor(
    /**
     * The deployments of the resource, tried in order. Unlike Gemini these are names the company
     * chose when deploying, so a model the caller asks for that was never deployed is ignored: the
     * settings of a company migrated from Gemini still hold `gemini-*`.
     */
    private readonly deployments: readonly string[] = [],
    endpoint = process.env.AZURE_OPENAI_ENDPOINT,
    private readonly apiKey = process.env.AZURE_OPENAI_API_KEY,
  ) {
    if (!endpoint) throw new AiUnavailableException('Falta configurar AZURE_OPENAI_ENDPOINT.');
    if (!apiKey) throw new AiUnavailableException('Falta configurar AZURE_OPENAI_API_KEY.');
    this.endpoint = endpoint.replace(/\/+$/, '');
  }

  async generate(request: ChatRequest): Promise<ChatResult> {
    const models = this.modelsFor(request.model);
    let lastError: unknown = null;

    for (const model of models) {
      try {
        return await this.complete(model, request);
      } catch (error) {
        lastError = error;
        if (!isRetryableWithAnotherModel(error)) break;
      }
    }

    throw new AiUnavailableException(`El modelo no respondió: ${describe(lastError)}`);
  }

  private modelsFor(requested: string): string[] {
    if (this.deployments.length === 0) return [requested];

    return this.deployments.includes(requested)
      ? [...new Set([requested, ...this.deployments])]
      : [...this.deployments];
  }

  private async complete(model: string, request: ChatRequest): Promise<ChatResult> {
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'api-key': this.apiKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: request.temperature,
        messages: [{ role: 'system', content: request.system }, ...request.contents.flatMap(toMessages)],
        ...(request.tools.length > 0
          ? {
              tools: request.tools.map((tool) => ({
                type: 'function',
                function: { name: tool.name, description: tool.description, parameters: tool.parameters },
              })),
              tool_choice: 'auto',
            }
          : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${(await response.text()).slice(0, 300)}`);
    }

    const body = (await response.json()) as CompletionResponse;
    const choice = body.choices?.[0];
    // `content_filter` means Azure blocked the answer: no text, no calls, and retrying another
    // model would be blocked just the same. The runner already knows how to warn the customer.
    const text = choice?.message?.content?.trim();

    return {
      text: text ? text : null,
      functionCalls: toFunctionCalls(choice?.message?.tool_calls ?? []),
      usage: body.usage
        ? {
            promptTokens: body.usage.prompt_tokens ?? 0,
            candidatesTokens: body.usage.completion_tokens ?? 0,
            totalTokens: body.usage.total_tokens ?? 0,
          }
        : null,
      model,
    };
  }
}

type CompletionResponse = {
  choices?: {
    finish_reason?: string;
    message?: { content?: string | null; tool_calls?: RawToolCall[] };
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

type RawToolCall = { id?: string; function?: { name?: string; arguments?: string } };

function toFunctionCalls(calls: RawToolCall[]): ChatFunctionCall[] {
  return calls
    .filter((call) => call.function?.name)
    .map((call) => ({
      name: call.function!.name!,
      args: parseArguments(call.function!.arguments),
      callId: call.id,
    }));
}

/**
 * The model writes the arguments as a JSON string and occasionally truncates it. An empty object
 * lets the tool's own Zod schema report what is missing, which the model can fix on the next turn;
 * throwing here would kill the customer's message instead.
 */
function parseArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * One turn becomes one message, except a tool turn: OpenAI wants a separate `tool` message per
 * result, each quoting the id of the call it answers.
 */
function toMessages(turn: ChatTurn): object[] {
  if (turn.role === 'tool') {
    return turn.parts
      .filter((part) => part.kind === 'functionResponse')
      .map((part) => ({
        role: 'tool',
        tool_call_id: callIdOf(part),
        content: JSON.stringify(part.response),
      }));
  }

  const text = turn.parts
    .filter((part) => part.kind === 'text')
    .map((part) => part.text)
    .join('')
    .trim();

  if (turn.role === 'user') return [{ role: 'user', content: text }];

  const toolCalls = turn.parts.filter((part) => part.kind === 'functionCall');

  return [
    {
      role: 'assistant',
      content: text === '' ? null : text,
      ...(toolCalls.length > 0
        ? {
            tool_calls: toolCalls.map((part) => ({
              id: callIdOf(part),
              type: 'function',
              function: { name: part.name, arguments: JSON.stringify(part.args) },
            })),
          }
        : {}),
    },
  ];
}

/**
 * Within a run the provider's own id is always there. The fallback only covers a history written by
 * another provider, which replays text and never calls, so two calls cannot collide on it.
 */
function callIdOf(part: Extract<ChatPart, { kind: 'functionCall' | 'functionResponse' }>): string {
  return part.callId ?? `call_${part.name}`;
}

/** A missing deployment is worth the next model of the chain; a bad key would fail the same way. */
function isRetryableWithAnotherModel(error: unknown): boolean {
  return /\b(404|408|429|500|502|503|504)\b|DeploymentNotFound|quota|rate limit|overloaded/i.test(describe(error));
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
