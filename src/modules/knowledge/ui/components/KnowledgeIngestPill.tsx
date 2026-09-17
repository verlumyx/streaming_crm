import type { KnowledgeIngestStatus } from '@/modules/knowledge/models/knowledge.model';

const LABELS: Record<KnowledgeIngestStatus, { label: string; className: string }> = {
  pending: { label: 'En cola', className: 'bg-warn-soft text-warn' },
  processing: { label: 'Indexando', className: 'bg-info-soft text-info' },
  indexed: { label: 'Indexado', className: 'bg-ok-soft text-ok' },
  failed: { label: 'Falló', className: 'bg-bad-soft text-bad' },
};

/** Where a document stands in the embedding pipeline — separate from its active/inactive status. */
export function KnowledgeIngestPill({ status }: { status: KnowledgeIngestStatus }) {
  const { label, className } = LABELS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold whitespace-nowrap ${className}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-85" />
      {label}
    </span>
  );
}
