import { beforeEach, describe, expect, it } from 'vitest';
import { asc, cosineDistance, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { knowledgeChunks, knowledgeDocuments } from '@/modules/knowledge/models/knowledge.model';
import { uuidv7 } from '@/modules/shared/uuid';
import { createHash } from 'node:crypto';
import { resetDb } from '../../helpers/reset-db';
import { createUserWithCompany } from '../../helpers/company-context';

/** Unit vector pointing at a single axis: two different axes are exactly orthogonal. */
function axis(index: number, dimensions = 768): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  vector[index] = 1;
  return vector;
}

async function seedChunk(companyId: string, content: string, embedding: number[]) {
  const documentId = uuidv7();
  await db.insert(knowledgeDocuments).values({
    id: documentId,
    companyId,
    code: `DOC${String(Math.floor(Math.random() * 900000) + 100000)}`,
    title: content,
    content,
    contentHash: createHash('sha256').update(content).digest('hex'),
  });
  await db.insert(knowledgeChunks).values({ id: uuidv7(), companyId, documentId, chunkIndex: 0, content, embedding });
  return documentId;
}

describe('pgvector', () => {
  beforeEach(resetDb);

  it('the extension is installed in the test database', async () => {
    const rows = await db.execute<{ extversion: string }>(
      sql`select extversion from pg_extension where extname = 'vector'`,
    );
    expect(rows[0]?.extversion).toBeTruthy();
  });

  it('stores and reads back a 768-dimension embedding', async () => {
    const { company } = await createUserWithCompany(db);
    const embedding = axis(7);
    await seedChunk(company.id, 'política de reembolsos', embedding);

    const [row] = await db.select().from(knowledgeChunks).where(eq(knowledgeChunks.companyId, company.id));
    expect(row.embedding).toHaveLength(768);
    expect(row.embedding[7]).toBe(1);
  });

  it('orders by cosine distance, nearest first', async () => {
    const { company } = await createUserWithCompany(db);
    await seedChunk(company.id, 'cerca', axis(3));
    await seedChunk(company.id, 'lejos', axis(500));

    const distance = cosineDistance(knowledgeChunks.embedding, axis(3));
    const rows = await db
      .select({ content: knowledgeChunks.content, similarity: sql<number>`1 - (${distance})` })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.companyId, company.id))
      .orderBy(asc(distance))
      .limit(2);

    expect(rows.map((r) => r.content)).toEqual(['cerca', 'lejos']);
    expect(Number(rows[0].similarity)).toBeCloseTo(1, 5);
    expect(Number(rows[1].similarity)).toBeCloseTo(0, 5);
  });

  it('never returns chunks of another company', async () => {
    const a = await createUserWithCompany(db);
    const b = await createUserWithCompany(db);
    await seedChunk(a.company.id, 'documento de A', axis(9));
    await seedChunk(b.company.id, 'documento de B', axis(9));

    const distance = cosineDistance(knowledgeChunks.embedding, axis(9));
    const rows = await db
      .select({ content: knowledgeChunks.content })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.companyId, a.company.id))
      .orderBy(asc(distance));

    expect(rows).toEqual([{ content: 'documento de A' }]);
  });
});
