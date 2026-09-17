import 'dotenv/config';

/**
 * Embeds the pending knowledge documents (`pnpm knowledge:ingest`).
 *
 * Runs under `tsx`, outside Next.js, because embedding is a multi-second HTTP call per document
 * and the project's rule is that a request-scoped transaction never spans network I/O.
 * Safe to run concurrently: jobs are claimed with `FOR UPDATE SKIP LOCKED`.
 */
async function main() {
  // Lazy imports so dotenv runs before `db/client` reads DATABASE_URL.
  const { db } = await import('@/db/client');
  const { createKnowledgeContainer } = await import('@/modules/knowledge/container');
  const { geminiEmbeddings } = await import('@/modules/bot/infrastructure/ai-factory');

  const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] ?? 20);
  const report = await createKnowledgeContainer(db, geminiEmbeddings()).ingestService.execute(limit);

  console.info(
    `Documentos tomados: ${report.claimed}. Indexados: ${report.indexed}. Fallidos: ${report.failed}.`,
  );
  process.exit(report.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
