import 'dotenv/config';

/**
 * Queues every document whose vectors were written by another embedding model (`pnpm knowledge:reindex`).
 *
 * Run it after switching `BOT_AI_PROVIDER` or `BOT_EMBEDDING_MODEL`: vectors of two models are not
 * comparable, and retrieval ignores the stale ones, so until this runs — and `pnpm knowledge:ingest`
 * drains the queue — the assistant answers without its knowledge base.
 *
 * Runs with `--conditions=react-server` for the same reason as `knowledge-ingest`.
 */
async function main() {
  // Lazy imports so dotenv runs before `db/client` reads DATABASE_URL.
  const { db } = await import('@/db/client');
  const { createKnowledgeContainer } = await import('@/modules/knowledge/container');
  const { embeddingModel } = await import('@/modules/bot/infrastructure/ai-factory');

  const embeddings = embeddingModel();
  const queued = await createKnowledgeContainer(db).repository.markStaleForReingest(embeddings.model);

  console.info(
    queued === 0
      ? `Nada que reindexar: todo está en ${embeddings.model}.`
      : `Documentos encolados para reindexar con ${embeddings.model}: ${queued}. Ejecuta "pnpm knowledge:ingest" para procesarlos.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
