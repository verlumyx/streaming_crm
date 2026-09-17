import { DEFAULT_PAGE_SIZE } from '@/modules/shared/pagination/page-items';
import type { SearchKnowledgeDocumentInput } from '../validation/search-knowledge-document.schema';

/** Keys MUST match `knowledgeDocumentFilters`. */
export type KnowledgeDocumentSearchFilters = Partial<
  Pick<SearchKnowledgeDocumentInput, 'title' | 'code' | 'status' | 'ingestStatus'>
>;

export class SearchKnowledgeDocumentCommand {
  readonly filters: KnowledgeDocumentSearchFilters;
  readonly limit: number;
  readonly offset: number;
  readonly companyId: string;

  constructor(params: {
    filters?: KnowledgeDocumentSearchFilters;
    limit?: number;
    offset?: number;
    companyId: string;
  }) {
    this.filters = params.filters ?? {};
    this.limit = params.limit ?? DEFAULT_PAGE_SIZE;
    this.offset = params.offset ?? 0;
    this.companyId = params.companyId;
  }

  static fromInput(input: SearchKnowledgeDocumentInput, companyId: string): SearchKnowledgeDocumentCommand {
    const { limit, offset, ...filters } = input;
    return new SearchKnowledgeDocumentCommand({ filters, limit, offset, companyId });
  }
}
