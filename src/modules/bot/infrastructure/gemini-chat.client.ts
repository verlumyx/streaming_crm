import 'server-only';
import { GoogleGenAI } from '@google/genai';
import type { Part } from '@google/genai';
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
        // A thought signature only means something to the model that issued it, so a fallback
        // model gets the conversation without them.
        const keepSignatures = model === request.model;
        const response = await this.client.models.generateContent({
          model,
          contents: request.contents.map((turn) => toGeminiContent(turn, keepSignatures)),
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
          .filter((part) => part.thought !== true)
          .map((part) => part.text ?? '')
          .join('')
          .trim();

        return {
          text: text === '' ? null : text,
          functionCalls: toFunctionCalls(parts),
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

/**
 * Gemini hands every function call a `thoughtSignature` and rejects the whole request
 * (INVALID_ARGUMENT) when the call is replayed without it. Gemini 3 signs each call; 2.5 only signs
 * the first part of the turn, which may be the thought or the text preceding the calls, so that one
 * is reused for the first call when it came unsigned.
 */
function toFunctionCalls(parts: Part[]): ChatFunctionCall[] {
  const turnSignature = parts.find((part) => part.thoughtSignature)?.thoughtSignature;

  return parts
    .filter((part) => part.functionCall?.name)
    .map((part, index) => ({
      name: part.functionCall!.name!,
      args: (part.functionCall!.args ?? {}) as Record<string, unknown>,
      thoughtSignature: part.thoughtSignature ?? (index === 0 ? turnSignature : undefined),
    }));
}

function toGeminiContent(turn: ChatTurn, keepSignatures: boolean) {
  return {
    role: turn.role === 'tool' ? 'user' : turn.role,
    parts: turn.parts.map((part) => toGeminiPart(part, keepSignatures)),
  };
}

function toGeminiPart(part: ChatPart, keepSignatures: boolean): Part {
  if (part.kind === 'text') return { text: part.text };
  if (part.kind === 'functionCall') {
    return {
      functionCall: { name: part.name, args: part.args },
      ...(keepSignatures && part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}),
    };
  }
  return { functionResponse: { name: part.name, response: part.response } };
}

function isRetryableWithAnotherModel(error: unknown): boolean {
  return /429|RESOURCE_EXHAUSTED|quota|503|UNAVAILABLE|overloaded/i.test(describe(error));
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
