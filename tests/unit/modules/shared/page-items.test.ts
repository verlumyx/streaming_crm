import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, pageItems, paginationState } from '@/modules/shared/pagination/page-items';

describe('page size', () => {
  it('defaults to 10 and offers 10, 20 and 50', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(10);
    expect(PAGE_SIZE_OPTIONS).toEqual([10, 20, 50]);
  });
});

describe('pageItems', () => {
  it('lists every page when there are few', () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('collapses distant pages around the current one', () => {
    expect(pageItems(1, 10)).toEqual([1, 2, 'ellipsis', 10]);
    expect(pageItems(3, 10)).toEqual([1, 2, 3, 4, 'ellipsis', 10]);
    expect(pageItems(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
    expect(pageItems(10, 10)).toEqual([1, 'ellipsis', 9, 10]);
  });
});

describe('paginationState', () => {
  it('derives the current page from the offset', () => {
    expect(paginationState({ total: 24, limit: 20, offset: 0 })).toMatchObject({ currentPage: 1, totalPages: 2 });
    expect(paginationState({ total: 24, limit: 20, offset: 20 })).toMatchObject({ currentPage: 2, totalPages: 2 });
    expect(paginationState({ total: 45, limit: 20, offset: 25 })).toMatchObject({ currentPage: 2, totalPages: 3 });
  });

  it('has a single page when the list is empty or fits in one page', () => {
    expect(paginationState({ total: 0, limit: 20, offset: 0 })).toMatchObject({ currentPage: 1, totalPages: 1 });
    expect(paginationState({ total: 20, limit: 20, offset: 0 })).toMatchObject({ currentPage: 1, totalPages: 1 });
  });

  it('clamps an offset beyond the last page', () => {
    expect(paginationState({ total: 24, limit: 20, offset: 200 })).toMatchObject({ currentPage: 2, totalPages: 2 });
  });
});
