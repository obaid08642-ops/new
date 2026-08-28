export interface PaginationParams {
  page: number;
  limit: number;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
}

export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
}

export interface CursorPageResult<T> {
  data: T[];
  nextCursor?: string;
  hasNext: boolean;
}
