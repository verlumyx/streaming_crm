import 'server-only';
import { GoogleGenAI } from '@google/genai';
import type { ChatModel, ChatPart, ChatRequest, ChatResult, ChatTurn } from './ai-ports';
import { AiUnavailableException } from '../exceptions/ai-unavailable.exception';

/**
 * Gemini chat with function calling and a model fallback chain: when the first model is rate
 * limited, the next one answers instead of failing the customer's message.
 */
export class GeminiChatModel implements ChatModel {
  private readonly client: GoogleGenAI;

  constructor(
    /** Tried in order; the request's own model goes first. */
    private readonly fallbackModels: readonly string[] = [],
    apiKey = process.env.GOOGLE_API_KEY,
  ) {
    if (!apiKey) throw new AiUnavailableException('Falta configurar GOOGLE_API_KEY.');
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(request: ChatRequest): Promise<ChatResult> {
    const models = [...new Set([request.model, ...this.fallbackModels])];
    let lastError: unknown = null;

    for (const model of models) {
      try {
        const response = await this.client.models.generateContent({
          model,
          contents: request.contents.map(toGeminiContent),
          config: {
            systemInstruction: request.system,
            temperature: request.temperature,
            ...(request.tools.length > 0
              ? { tools: [{ functionDeclarations: request.tools.map((tool) => ({ ...tool })) }] }
              : {}),
          },
        });

        const parts = response.candidates?.[0]?.content?.parts ?? [];
        const text = parts
          .map((part) => part.text ?? '')
          .join('')
          .trim();

        return {
          text: text === '' ? null : text,
          functionCalls: parts
            .filter((part) => part.functionCall?.name)
            .map((part) => ({
              name: part.functionCall!.name!,
              args: (part.functionCall!.args ?? {}) as Record<string, unknown>,
            })),
          usage: response.usageMetadata
            ? {
                promptTokens: response.usageMetadata.promptTokenCount ?? 0,
                candidatesTokens: response.usageMetadata.candidatesTokenCount ?? 0,
                totalTokens: response.usageMetadata.totalTokenCount ?? 0,
              }
            : null,
          model,
        };
      } catch (error) {
        lastError = error;
        // Only a quota problem is worth trying the next model; anything else would fail the same way.
        if (!isRetryableWithAnotherModel(error)) break;
      }
    }

    throw new AiUnavailableException(`El modelo no respondió: ${describe(lastError)}`);
  }
}

function toGeminiContent(turn: ChatTurn) {
  return { role: turn.role === 'tool' ? 'user' : turn.role, parts: turn.parts.map(toGeminiPart) };
}

function toGeminiPart(part: ChatPart) {
  if (part.kind === 'text') return { text: part.text };
  if (part.kind === 'functionCall') return { functionCall: { name: part.name, args: part.args } };
  return { functionResponse: { name: part.name, response: part.response } };
}

function isRetryableWithAnotherModel(error: unknown): boolean {
  return /429|RESOURCE_EXHAUSTED|quota|503|UNAVAILABLE|overloaded/i.test(describe(error));
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
