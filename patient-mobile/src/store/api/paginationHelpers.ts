import { PaginatedResponse } from '../../services/HttpClient';

/**
 * Generic merge function for infinite scrolling in RTK Query.
 * Handles merging incoming paginated data with existing cached data.
 */
export function mergePaginatedResults<T>(
  currentCache: PaginatedResponse<T> | undefined,
  newResponse: PaginatedResponse<T>,
  arg: { page: number }
): PaginatedResponse<T> {
  if (!currentCache || arg.page === 1) {
    return newResponse;
  }

  return {
    ...newResponse,
    items: [...currentCache.items, ...newResponse.items],
  };
}
