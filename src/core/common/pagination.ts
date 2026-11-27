export type SortDirection = 'asc' | 'desc';

export interface PageRequest {
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy?: string;
  readonly sortDirection?: SortDirection;
}

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

export function paginateArray<T>(items: readonly T[], request: PageRequest): PageResult<T> {
  const safePageSize = Math.max(1, Math.min(100, Math.trunc(request.pageSize)));
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.max(1, Math.min(totalPages, Math.trunc(request.page)));
  const start = (safePage - 1) * safePageSize;
  return {
    items: items.slice(start, start + safePageSize),
    totalItems,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}
