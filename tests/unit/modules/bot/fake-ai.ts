import { createHash } from 'node:crypto';
import type { ChatModel, ChatRequest, ChatResult, EmbeddingModel } from '@/modules/bot/infrastructure/ai-ports';

/**
 * Deterministic embeddings: the same text always yields the same unit vector, and similar texts
 * share leading hash bytes, so cosine similarity is reproducible across runs without a network call.
 */
export class FakeEmbeddingModel implements EmbeddingModel {
  readonly model = 'fake-embedding';
  calls: string[][] = [];

  constructor(readonly dimensions = 768) {}

  async embedDocuments(texts: string[]): Promise<number[][]> {
    this.calls.push(texts);
    return texts.map((text) => this.vectorOf(text));
  }

  async embedQuery(text: string): Promise<number[]> {
    this.calls.push([text]);
    return this.vectorOf(text);
  }

  private vectorOf(text: string): number[] {
    // Bag of word hashes: texts sharing words end up close, which is what the retriever tests need.
    const vector = new Array<number>(this.dimensions).fill(0);
    for (const word of text.toLowerCase().split(/\W+/).filter(Boolean)) {
      const digest = createHash('sha256').update(word).digest();
      for (let i = 0; i < digest.length; i++) {
        vector[(digest[i] * 31 + i) % this.dimensions] += digest[i] / 255;
      }
    }
    const norm = Math.hypot(...vector) || 1;
    return vector.map((v) => v / norm);
  }
}

export type ScriptedTurn = Partial<Pick<ChatResult, 'text' | 'functionCalls'>>;

/** Replays a scripted conversation so the agent loop can be tested turn by turn. */
export class FakeChatModel implements ChatModel {
  requests: ChatRequest[] = [];
  private index = 0;

  constructor(private readonly script: ScriptedTurn[]) {}

  async generate(request: ChatRequest): Promise<ChatResult> {
    this.requests.push(request);
    const turn = this.script[this.index] ?? {};
    this.index++;
    return {
      text: turn.text ?? null,
      functionCalls: turn.functionCalls ?? [],
      usage: { promptTokens: 10, candidatesTokens: 5, totalTokens: 15 },
      model: request.model,
    };
  }
}
