import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core';
import { user } from '@/db/auth-schema';
import { companies } from '@/modules/company/models/company.model';

export const KNOWLEDGE_CODE_PREFIX = 'DOC';

export const KNOWLEDGE_DOCUMENT_STATUSES = ['active', 'inactive'] as const;
export type KnowledgeDocumentStatus = (typeof KNOWLEDGE_DOCUMENT_STATUSES)[number];

export const KNOWLEDGE_INGEST_STATUSES = ['pending', 'processing', 'indexed', 'failed'] as const;
export type KnowledgeIngestStatus = (typeof KNOWLEDGE_INGEST_STATUSES)[number];

export const KNOWLEDGE_SOURCE_TYPES = ['manual', 'upload'] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

/** Must match `botSettings.embeddingDimensions`; the column type is fixed at migration time. */
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 768;

/** What the company teaches the assistant: policies, FAQs, catalogue notes. The source of truth. */
export const knowledgeDocuments = pgTable(
  'app_knowledge_documents',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 12 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    sourceType: varchar('source_type', { length: 20 }).notNull().default('manual').$type<KnowledgeSourceType>(),
    content: text('content').notNull(),
    /** sha256 of `content`: re-ingesting an unchanged document is a no-op. */
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    /** `inactive` removes it from retrieval without deleting anything (`no-delete-policy`). */
    status: varchar('status', { length: 20 }).notNull().default('active').$type<KnowledgeDocumentStatus>(),
    ingestStatus: varchar('ingest_status', { length: 20 }).notNull().default('pending').$type<KnowledgeIngestStatus>(),
    ingestError: text('ingest_error'),
    chunkCount: integer('chunk_count').notNull().default(0),
    indexedAt: timestamp('indexed_at', { withTimezone: true }),
    embeddingModel: varchar('embedding_model', { length: 60 }),
    embeddingDimensions: smallint('embedding_dimensions'),
    createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('app_knowledge_documents_company_id_code_unique').on(t.companyId, t.code),
    index('app_knowledge_documents_company_id_status_idx').on(t.companyId, t.status),
    index('app_knowledge_documents_ingest_status_idx').on(t.ingestStatus),
    check('app_knowledge_documents_status_check', sql`${t.status} in ('active', 'inactive')`),
    check(
      'app_knowledge_documents_ingest_status_check',
      sql`${t.ingestStatus} in ('pending', 'processing', 'indexed', 'failed')`,
    ),
    check('app_knowledge_documents_source_type_check', sql`${t.sourceType} in ('manual', 'upload')`),
  ],
);

/**
 * Derived search index, not a business record: re-ingesting a document deletes and rewrites its
 * chunks. This is the one deliberate exception to `no-delete-policy` — the source of truth
 * (`knowledgeDocuments.content`) is never deleted and keeps its own history.
 *
 * `companyId` is denormalized on purpose so the vector query filters by tenant without a join.
 */
export const knowledgeChunks = pgTable(
  'app_knowledge_chunks',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    tokenEstimate: integer('token_estimate'),
    embedding: vector('embedding', { dimensions: KNOWLEDGE_EMBEDDING_DIMENSIONS }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('app_knowledge_chunks_document_id_chunk_index_unique').on(t.documentId, t.chunkIndex),
    index('app_knowledge_chunks_company_id_idx').on(t.companyId),
    // Only `ORDER BY embedding <=> $query ASC LIMIT n` uses this index.
    index('app_knowledge_chunks_embedding_hnsw_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
    check('app_knowledge_chunks_chunk_index_check', sql`${t.chunkIndex} >= 0`),
  ],
);

export const knowledgeDocumentsRelations = relations(knowledgeDocuments, ({ one, many }) => ({
  company: one(companies, { fields: [knowledgeDocuments.companyId], references: [companies.id] }),
  creator: one(user, { fields: [knowledgeDocuments.createdBy], references: [user.id] }),
  chunks: many(knowledgeChunks),
}));

export const knowledgeChunksRelations = relations(knowledgeChunks, ({ one }) => ({
  company: one(companies, { fields: [knowledgeChunks.companyId], references: [companies.id] }),
  document: one(knowledgeDocuments, { fields: [knowledgeChunks.documentId], references: [knowledgeDocuments.id] }),
}));

export type KnowledgeDocumentRow = InferSelectModel<typeof knowledgeDocuments>;
export type NewKnowledgeDocumentRow = InferInsertModel<typeof knowledgeDocuments>;
export type KnowledgeChunkRow = InferSelectModel<typeof knowledgeChunks>;
export type NewKnowledgeChunkRow = InferInsertModel<typeof knowledgeChunks>;
