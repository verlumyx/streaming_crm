import type { EmbeddingModel } from '@/modules/bot/infrastructure/ai-ports';
import type { KnowledgeChunkData, KnowledgeRepository } from '../repositories/knowledge.repository';
import { splitText } from '../domain/text-splitter';
import { estimateTokens } from '../domain/content-hash';

export type IngestReport = { claimed: number; indexed: number; failed: number };

/**
 * Turns pending documents into searchable chunks.
 *
 * Runs in the worker, NOT in a request: embedding a document is a multi-second HTTP call, and the
 * project's rule is that a transaction never spans network I/O. So this claims the job, embeds
 * outside any transaction, and only then writes the chunks.
 */
export class KnowledgeIngestService {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly embeddings: EmbeddingModel,
  ) {}

  async execute(limit = 5): Promise<IngestReport> {
    const jobs = await this.repository.claimPendingIngest(limit);
    const report: IngestReport = { claimed: jobs.length, indexed: 0, failed: 0 };

    for (const job of jobs) {
      try {
        const pieces = splitText(job.content);
        const vectors = pieces.length > 0 ? await this.embeddings.embedDocuments(pieces) : [];

        const chunks: KnowledgeChunkData[] = pieces.map((content, chunkIndex) => ({
          chunkIndex,
          content,
          tokenEstimate: estimateTokens(content),
          embedding: vectors[chunkIndex],
        }));

        await this.repository.replaceChunks(job.id, job.companyId, chunks, {
          embeddingModel: this.embeddings.model,
          embeddingDimensions: this.embeddings.dimensions,
        });
        report.indexed++;
      } catch (error) {
        // One bad document must not stop the batch; the admin sees the reason in the console.
        await this.repository.markIngestFailed(job.id, error instanceof Error ? error.message : String(error));
        report.failed++;
      }
    }

    return report;
  }
}
