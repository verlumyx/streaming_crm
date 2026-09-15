import 'dotenv/config';

/**
 * Daily sales expiration job (`pnpm sales:expire`, scheduled by cron at 00:30).
 * Runs under `tsx`, outside Next.js, for every company.
 */
async function main() {
  // Lazy imports so dotenv runs before `db/client` reads DATABASE_URL.
  const { db } = await import('@/db/client');
  const { todayIsoDate } = await import('@/lib/format');
  const { createSaleContainer } = await import('@/modules/sale/container');

  const today = todayIsoDate();
  const { expired, released } = await createSaleContainer(db).expireService.execute(today);

  console.info(`[${today}] Ventas expiradas: ${expired}. Ventas con perfiles liberados: ${released}.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
