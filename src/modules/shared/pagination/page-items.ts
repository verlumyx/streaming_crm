/** Registros por página de las listas de módulo (los reportes definen el suyo). */
export const DEFAULT_PAGE_SIZE = 10;

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type PageItem = number | 'ellipsis';

export type PaginationMeta = { total: number; limit: number; offset: number };

/** Pages to render: always the first, the last and `siblings` around the current one, collapsed with `ellipsis`. */
export function pageItems(currentPage: number, totalPages: number, siblings = 1): PageItem[] {
  if (totalPages <= 5 + siblings * 2) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const start = Math.max(2, currentPage - siblings);
  const end = Math.min(totalPages - 1, currentPage + siblings);
  const items: PageItem[] = [1];

  if (start > 2) items.push('ellipsis');
  for (let page = start; page <= end; page++) items.push(page);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);

  return items;
}

/** Derives the current page and the page list from a list `meta` (offset-based). */
export function paginationState({ total, limit, offset }: PaginationMeta) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(totalPages, Math.floor(offset / limit) + 1);

  return { currentPage, totalPages, pages: pageItems(currentPage, totalPages) };
}
