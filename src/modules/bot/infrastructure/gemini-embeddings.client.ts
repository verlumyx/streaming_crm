import 'server-only';
import { GoogleGenAI } from '@google/genai';
import type { EmbeddingModel } from './ai-ports';
import { AiUnavailableException } from '../exceptions/ai-unavailable.exception';

/** Gemini caps `batchEmbedContents` well above this; 50 keeps a failed batch cheap to retry. */
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
/** Used when a 429 does not tell us how long to wait. */
const FALLBACK_RETRY_MS = 30_000;

/**
 * `gemini-embedding-001` truncated to `dimensions` via Matryoshka (`outputDimensionality`),
 * matching the `vector(768)` column. Changing the dimension invalidates every stored chunk.
 *
 * Documents and queries are embedded with different task types, which is what the model expects
 * for retrieval and measurably improves the ranking.
 */
export class GeminiEmbeddings implements EmbeddingModel {
  private readonly client: GoogleGenAI;

  constructor(
    readonly model: string,
    readonly dimensions: number,
    apiKey = process.env.GOOGLE_API_KEY,
  ) {
    if (!apiKey) throw new AiUnavailableException('Falta configurar GOOGLE_API_KEY.');
    this.client = new GoogleGenAI({ apiKey });
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      vectors.push(...(await this.embed(texts.slice(i, i + BATCH_SIZE), 'RETRIEVAL_DOCUMENT')));
    }
    return vectors;
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([text], 'RETRIEVAL_QUERY');
    return vector;
  }

  private async embed(texts: string[], taskType: string): Promise<number[][]> {
    if (texts.length === 0) return [];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await this.client.models.embedContent({
          model: this.model,
          contents: texts,
          config: { outputDimensionality: this.dimensions, taskType },
        });

        const vectors = response.embeddings?.map((e) => e.values ?? []) ?? [];
        if (vectors.length !== texts.length || vectors.some((v) => v.length !== this.dimensions)) {
          throw new AiUnavailableException(
            `El modelo de embeddings devolvió vectores inesperados (se esperaban ${texts.length} de ${this.dimensions} dimensiones).`,
          );
        }
        return vectors;
      } catch (error) {
        if (error instanceof AiUnavailableException) throw error;
        if (attempt === MAX_ATTEMPTS) {
          throw new AiUnavailableException(`No se pudieron generar los embeddings: ${describe(error)}`);
        }
        await sleep(retryDelayMs(error, attempt));
      }
    }

    // Unreachable: the loop either returns or throws.
    throw new AiUnavailableException('No se pudieron generar los embeddings.');
  }
}

/** Gemini reports its own cooldown on a 429; honouring it beats a blind exponential backoff. */
function retryDelayMs(error: unknown, attempt: number): number {
  const match = /"retryDelay"\s*:\s*"(\d+)s"/.exec(describe(error));
  if (match) return Number(match[1]) * 1000;
  return isRateLimited(error) ? FALLBACK_RETRY_MS : Math.min(2 ** attempt * 1000, 16_000);
}

function isRateLimited(error: unknown): boolean {
  return /429|RESOURCE_EXHAUSTED|quota/i.test(describe(error));
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
