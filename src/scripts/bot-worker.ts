import 'dotenv/config';

/**
 * The authoritative drain of the inbound queue (`pnpm bot:worker`).
 *
 * The webhook's `after()` kick is only an optimisation for latency; this process is what guarantees
 * retries, dead-lettering, reclaiming events whose worker died, expiring stale handoffs and keeping
 * the knowledge base indexed. Runs under `tsx`, outside Next.js, with no request timeout.
 *
 * Safe to run several instances: every claim uses `FOR UPDATE SKIP LOCKED`.
 *
 * Runs with `--conditions=react-server` (see package.json): this is a server environment, but
 * outside Next the `server-only` guard its modules import would throw. The condition resolves
 * that package to its own empty module, so the guard keeps protecting Client Components only.
 */
const POLL_MS = Number(process.env.BOT_WORKER_POLL_MS ?? 2000);
const BATCH_SIZE = Number(process.env.BOT_WORKER_BATCH_SIZE ?? 5);
const STUCK_MINUTES = Number(process.env.BOT_WORKER_STUCK_MINUTES ?? 10);
/** Housekeeping is cheap but pointless every tick. */
const MAINTENANCE_EVERY = 30;
const STALE_PENDING_MINUTES = Number(process.env.BOT_STALE_PENDING_TTL_MINUTES ?? 180);

let stopping = false;

async function main() {
  // Fail fast and clearly: without a key every cycle would throw and log noise every two seconds.
  if (!process.env.GOOGLE_API_KEY) {
    console.error('[bot-worker] Falta GOOGLE_API_KEY. Configúrala en .env (https://aistudio.google.com/apikey).');
    process.exit(1);
  }

  // Lazy imports so dotenv runs before `db/client` reads DATABASE_URL.
  const { db } = await import('@/db/client');
  const { createBotContainer } = await import('@/modules/bot/container');
  const { createConversationContainer } = await import('@/modules/conversation/container');
  const { createKnowledgeContainer } = await import('@/modules/knowledge/container');
  const { geminiEmbeddings } = await import('@/modules/bot/infrastructure/ai-factory');

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      console.info(`\n[bot-worker] ${signal} recibido; terminando el lote en curso…`);
      stopping = true;
    });
  }

  console.info(`[bot-worker] escuchando (lote ${BATCH_SIZE}, cada ${POLL_MS} ms). Ctrl+C para parar.`);
  let tick = 0;

  while (!stopping) {
    tick++;
    try {
      const report = await createBotContainer(db).drainService(BATCH_SIZE);
      if (report.claimed > 0) {
        console.info(
          `[bot-worker] ${report.claimed} evento(s): ${report.answered} respondidos, ` +
            `${report.silenced} en silencio, ${report.failed} reintentables, ${report.dlq} a la cola muerta.`,
        );
      }

      if (tick % MAINTENANCE_EVERY === 0) {
        const reclaimed = await createBotContainer(db).eventRepository.reclaimStuck(STUCK_MINUTES);
        const returned = await createConversationContainer(db).repository.expireHandoffs();
        const ingest = await createKnowledgeContainer(db, geminiEmbeddings()).ingestService.execute(BATCH_SIZE);

        const bot = createBotContainer(db);
        const botUserIds = await bot.settingsRepository.listAgentUserIds();
        const { rejected } = await bot.staleSalesService.execute(STALE_PENDING_MINUTES, botUserIds);

        if (reclaimed || returned || ingest.claimed || rejected) {
          console.info(
            `[bot-worker] mantenimiento: ${reclaimed} evento(s) reencolados, ` +
              `${returned} conversación(es) devueltas al bot, ${ingest.indexed} documento(s) indexados, ` +
              `${rejected} venta(s) sin pago rechazadas.`,
          );
        }
      }
    } catch (error) {
      // A transient database or provider failure must not kill the worker.
      console.error('[bot-worker] ciclo fallido', error);
    }

    if (!stopping) await sleep(POLL_MS);
  }

  console.info('[bot-worker] detenido.');
  process.exit(0);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
