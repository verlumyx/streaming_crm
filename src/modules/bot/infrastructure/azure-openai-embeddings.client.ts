import 'server-only';
import type { EmbeddingModel } from './ai-ports';
import { AiUnavailableException } from '../exceptions/ai-unavailable.exception';

/** Azure accepts far more inputs per call; 50 keeps a failed batch cheap to retry. */
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
/** Used when a 429 does not carry `Retry-After`. */
const FALLBACK_RETRY_MS = 30_000;

/**
 * `text-embedding-3-small` truncated to `dimensions` (Matryoshka, the `dimensions` parameter),
 * matching the `vector(768)` column. Changing the model or the dimension invalidates every stored
 * chunk: vectors of two different models are not comparable, so a switch means re-ingesting
 * (`pnpm knowledge:reindex`).
 *
 * Unlike Gemini there is no task type — this family embeds documents and queries the same way.
 */
export class AzureOpenAiEmbeddings implements EmbeddingModel {
  private readonly endpoint: string;

  constructor(
    readonly model: string,
    readonly dimensions: number,
    endpoint = process.env.AZURE_OPENAI_ENDPOINT,
    private readonly apiKey = process.env.AZURE_OPENAI_API_KEY,
  ) {
    if (!endpoint) throw new AiUnavailableException('Falta configurar AZURE_OPENAI_ENDPOINT.');
    if (!apiKey) throw new AiUnavailableException('Falta configurar AZURE_OPENAI_API_KEY.');
    this.endpoint = endpoint.replace(/\/+$/, '');
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      vectors.push(...(await this.embed(texts.slice(i, i + BATCH_SIZE))));
    }
    return vectors;
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([text]);
    return vector;
  }

  private async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.request(texts);
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

  private async request(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.endpoint}/embeddings`, {
      method: 'POST',
      headers: { 'api-key': this.apiKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: texts, dimensions: this.dimensions }),
    });

    if (!response.ok) {
      const retryAfter = response.headers.get('retry-after');
      throw new Error(
        `${response.status} ${(await response.text()).slice(0, 300)}${retryAfter ? ` retry-after=${retryAfter}` : ''}`,
      );
    }

    const body = (await response.json()) as { data?: { index?: number; embedding?: number[] }[] };
    // The API documents the order but ships `index` for a reason; sorting costs nothing and a
    // shuffled batch would silently attach each vector to the wrong chunk.
    const vectors = [...(body.data ?? [])]
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((item) => item.embedding ?? []);

    if (vectors.length !== texts.length || vectors.some((vector) => vector.length !== this.dimensions)) {
      throw new AiUnavailableException(
        `El modelo de embeddings devolvió vectores inesperados (se esperaban ${texts.length} de ${this.dimensions} dimensiones).`,
      );
    }

    return vectors;
  }
}

/** Azure reports its own cooldown on a 429; honouring it beats a blind exponential backoff. */
function retryDelayMs(error: unknown, attempt: number): number {
  const match = /retry-after=(\d+)/.exec(describe(error));
  if (match) return Number(match[1]) * 1000;
  return isRateLimited(error) ? FALLBACK_RETRY_MS : Math.min(2 ** attempt * 1000, 16_000);
}

function isRateLimited(error: unknown): boolean {
  return /\b429\b|quota|rate limit/i.test(describe(error));
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
