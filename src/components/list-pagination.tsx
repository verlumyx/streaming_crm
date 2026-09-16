'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  paginationState,
  type PaginationMeta,
} from '@/modules/shared/pagination/page-items';
import type { RouteQuery } from '@/modules/shared/routes/with-query';

interface ListPaginationProps {
  meta: PaginationMeta;
  /** Builder del índice del módulo, p. ej. `(query) => clientRoutes.index(companyId, query)`. */
  href: (query: RouteQuery) => string;
}

/** Paginación de las listas: conserva los filtros de la URL y solo mueve `limit` / `offset`. */
export function ListPagination({ meta, href }: ListPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentPage, totalPages, pages } = paginationState(meta);

  if (meta.total === 0) return null;

  const navigate = (query: RouteQuery) => router.push(href({ ...Object.fromEntries(searchParams), ...query }));

  const goToPage = (page: number) => navigate({ offset: page > 1 ? (page - 1) * meta.limit : undefined });

  const changePageSize = (value: string) =>
    navigate({ limit: Number(value) === DEFAULT_PAGE_SIZE ? undefined : value, offset: undefined });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span>Mostrar</span>
        <SearchableSelect
          aria-label="Registros por página"
          options={PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: String(size) }))}
          value={String(meta.limit)}
          onChange={(value) => value && changePageSize(value)}
          emptyText="Sin resultados"
          className="bg-card h-8 w-20 tabular-nums"
          contentClassName="w-40"
        />
      </div>

      {totalPages > 1 && (
        <nav aria-label="Paginación" className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Página anterior"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="px-2 tabular-nums sm:hidden">
            {currentPage} / {totalPages}
          </span>
          {pages.map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="hidden px-1 sm:inline">
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'ghost'}
                size="icon-sm"
                className="hidden tabular-nums sm:inline-flex"
                aria-label={`Página ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
                onClick={() => goToPage(page)}
              >
                {page}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Página siguiente"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            <ChevronRight />
          </Button>
        </nav>
      )}
    </div>
  );
}
