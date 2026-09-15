import 'dotenv/config';

async function main() {
  // Lazy imports so dotenv runs before `db/client` reads DATABASE_URL.
  const { db } = await import('@/db/client');
  const { auth } = await import('@/lib/auth');
  const { seedPermissions, seedMenus } = await import('./registries');
  const { seedInitialCompany, INITIAL_ADMIN } = await import('./initial-company');

  const ctx = await auth.$context;
  const hashPassword = (plain: string) => ctx.password.hash(plain);

  const result = await db.transaction(async (tx) => {
    const perms = await seedPermissions(tx);
    const menuCount = await seedMenus(tx);
    const company = await seedInitialCompany(tx, hashPassword);
    return { perms, menuCount, company };
  });

  console.info(`Modules: ${result.perms.modules}, permissions: ${result.perms.permissions}, menus: ${result.menuCount}`);
  console.info(
    result.company === 'created'
      ? `Initial company created. Login: ${INITIAL_ADMIN.email} / ${INITIAL_ADMIN.password}`
      : 'Initial company already exists (skipped).',
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
