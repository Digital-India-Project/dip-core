import { createDomainError, DomainError, ErrorCode, SafeMetadataPrimitive } from '../errors/domainError.js';
import { err, ok, Result } from './result.js';

export type SortDirection = 'asc' | 'desc';

export type FilterOperator = 'eq' | 'neq' | 'in' | 'gte' | 'lte' | 'contains';

export interface SortSpec {
  readonly field: string;
  readonly direction: SortDirection;
}

export interface FilterCriterion {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value: SafeMetadataPrimitive | readonly SafeMetadataPrimitive[];
}

export interface FilterSpec {
  readonly criteria: readonly FilterCriterion[];
}

export type MetadataContract = Readonly<Record<string, SafeMetadataPrimitive>>;

export interface PageRequest {
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy?: string;
  readonly sortDirection?: SortDirection;
  readonly sort?: readonly SortSpec[];
  readonly filters?: FilterSpec;
}

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

const SAFE_FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function createPageRequest(
  raw: Partial<PageRequest>,
  allowedSortFields?: readonly string[]
): Result<PageRequest, DomainError> {
  const page = raw.page ?? 1;
  const pageSize = raw.pageSize ?? 20;

  if (!Number.isInteger(page) || page < 1) {
    return err(
      createDomainError(
        ErrorCode.INVALID_FILTER_OR_SORT,
        'Page must be a positive integer starting at 1.',
        'page'
      )
    );
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return err(
      createDomainError(
        ErrorCode.INVALID_FILTER_OR_SORT,
        'PageSize must be an integer between 1 and 100.',
        'pageSize'
      )
    );
  }
  if (raw.sortBy !== undefined) {
    if (
      UNSAFE_KEYS.has(raw.sortBy) ||
      !SAFE_FIELD_NAME_PATTERN.test(raw.sortBy) ||
      (allowedSortFields && !allowedSortFields.includes(raw.sortBy))
    ) {
      return err(
        createDomainError(
          ErrorCode.INVALID_FILTER_OR_SORT,
          `Sort field "${raw.sortBy}" is invalid or not permitted.`,
          'sortBy'
        )
      );
    }
  }
  if (raw.sortDirection !== undefined && raw.sortDirection !== 'asc' && raw.sortDirection !== 'desc') {
    return err(
      createDomainError(
        ErrorCode.INVALID_FILTER_OR_SORT,
        'Sort direction must be "asc" or "desc".',
        'sortDirection'
      )
    );
  }

  return ok({
    page,
    pageSize,
    ...(raw.sortBy !== undefined ? { sortBy: raw.sortBy } : {}),
    ...(raw.sortDirection !== undefined ? { sortDirection: raw.sortDirection } : {}),
    ...(raw.sort !== undefined ? { sort: raw.sort } : {}),
    ...(raw.filters !== undefined ? { filters: raw.filters } : {}),
  });
}

export function paginateArray<T>(items: readonly T[], request: PageRequest): PageResult<T> {
  const rawPageSize = Number.isFinite(request.pageSize) ? Math.trunc(request.pageSize) : 20;
  const safePageSize = Math.max(1, Math.min(100, rawPageSize));
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const rawPage = Number.isFinite(request.page) ? Math.trunc(request.page) : 1;
  const safePage = Math.max(1, Math.min(totalPages, rawPage));
  const start = (safePage - 1) * safePageSize;
  return {
    items: items.slice(start, start + safePageSize),
    totalItems,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}
