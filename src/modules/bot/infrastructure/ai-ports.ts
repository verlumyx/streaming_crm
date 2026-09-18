/**
 * Ports for the AI provider. Services depend on these, never on a vendor SDK, exactly as they
 * depend on `DbExecutor` instead of Drizzle. This is what lets every test run without a network call
 * and what lets one company talk to Gemini while another talks to Azure OpenAI.
 */

export type ChatRole = 'user' | 'model' | 'tool';

export type ChatPart =
  | { kind: 'text'; text: string }
  | ({ kind: 'functionCall' } & ChatFunctionCall)
  | {
      kind: 'functionResponse';
      name: string;
      response: Record<string, unknown>;
      /** Echoes the `callId` of the call being answered. See `ChatFunctionCall.callId`. */
      callId?: string;
    };

export type ChatFunctionCall = {
  name: string;
  args: Record<string, unknown>;
  /**
   * Gemini only. Opaque token the provider attaches to a call and demands back when the call is
   * replayed in the next request. Carried through untouched: it is meaningless to us and only valid
   * for the model that issued it.
   */
  thoughtSignature?: string;
  /**
   * OpenAI and Azure OpenAI only. Identifies the call within the turn; the tool result must quote it
   * back, because that provider pairs a result with its call by id and not by name — the same tool
   * may be called twice in one turn. Lives only inside a run: the history replays text, never calls.
   */
  callId?: string;
};

export type ChatTurn = { role: ChatRole; parts: ChatPart[] };

/**
 * A tool as the model sees it. `parameters` is the JSON Schema Zod emits, untouched: each adapter
 * narrows it to what its own provider accepts (Gemini takes an OpenAPI 3.0 subset, OpenAI takes
 * full JSON Schema and needs the very keywords Gemini rejects).
 */
export type ToolDeclaration = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type TokenUsage = {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
};

export type ChatRequest = {
  system: string;
  contents: ChatTurn[];
  tools: ToolDeclaration[];
  model: string;
  temperature: number;
};

export type ChatResult = {
  text: string | null;
  functionCalls: ChatFunctionCall[];
  usage: TokenUsage | null;
  /** Which model of the fallback chain actually answered. */
  model: string;
};

export interface ChatModel {
  generate(request: ChatRequest): Promise<ChatResult>;
}

export interface EmbeddingModel {
  readonly model: string;
  readonly dimensions: number;
  /** Batched: one vector per input, in the same order. */
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}
