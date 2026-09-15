import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function main() {
  const url = process.argv.includes('--test') ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL (or DATABASE_URL_TEST with --test) is not defined.');

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: './drizzle' });
  await sql.end();
  console.info(`Migrations applied to ${url.replace(/:\/\/.*@/, '://***@')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
