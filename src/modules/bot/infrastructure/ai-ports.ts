/**
 * Ports for the AI provider. Services depend on these, never on `@google/genai`, exactly as they
 * depend on `DbExecutor` instead of Drizzle. This is what lets every test run without a network call.
 */

export type ChatRole = 'user' | 'model' | 'tool';

export type ChatPart =
  | { kind: 'text'; text: string }
  | ({ kind: 'functionCall' } & ChatFunctionCall)
  | { kind: 'functionResponse'; name: string; response: Record<string, unknown> };

export type ChatFunctionCall = {
  name: string;
  args: Record<string, unknown>;
  /**
   * Opaque token the provider attaches to a call and demands back when the call is replayed in the
   * next request. Carried through untouched: it is meaningless to us and only valid for the model
   * that issued it.
   */
  thoughtSignature?: string;
};

export type ChatTurn = { role: ChatRole; parts: ChatPart[] };

/** A tool as the model sees it. `parameters` is JSON Schema in Gemini's OpenAPI 3.0 subset. */
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
