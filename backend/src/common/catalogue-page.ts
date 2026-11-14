/** Paging and rating for the public lab and radiology catalogues (GET /labs/services, GET /radiology/services). */

const MAX_LIMIT = 100;

/** `page` asked → a page is wanted; none asked → the whole list as before (older clients keep reading an array). */
export function parsePage(page?: unknown, limit?: unknown): { page: number; limit: number } | undefined {
  if (page === undefined || page === null || page === '') return undefined;
  const p = Math.floor(Number(page));
  const l = Math.floor(Number(limit));
  return { page: Number.isFinite(p) && p >= 1 ? Math.min(p, 10_000) : 1, limit: Number.isFinite(l) && l >= 1 ? Math.min(l, MAX_LIMIT) : 20 };
}

export interface CataloguePage<T> { data: T[]; total: number; page: number; limit: number; total_pages: number }

export function paged<T>(rows: T[], p: { page: number; limit: number }): CataloguePage<T> {
  const total = rows.length;
  const start = (p.page - 1) * p.limit;
  return { data: rows.slice(start, start + p.limit), total, page: p.page, limit: p.limit, total_pages: Math.ceil(total / p.limit) };
}

type Rated = { rating_avg?: number; rating_count?: number };

/**
 * Ratings live on the providers (rating_avg, rating_count), not on the service. A service's rating is the mean of the ratings of
 * the providers that perform it, weighted by how many ratings each has; null while none of them has been rated.
 */
export function withProviderRating<S extends Record<string, any>, P extends Rated>(
  services: S[], providers: P[], performs: (service: S, provider: P) => boolean,
): (S & { rating: number | null; rating_count: number })[] {
  const rated = providers.filter((p) => Number(p.rating_count) > 0 && Number(p.rating_avg) > 0);
  return services.map((service) => {
    let sum = 0;
    let count = 0;
    for (const p of rated) {
      if (!performs(service, p)) continue;
      sum += Number(p.rating_avg) * Number(p.rating_count);
      count += Number(p.rating_count);
    }
    return { ...service, rating: count ? Math.round((sum / count) * 100) / 100 : null, rating_count: count };
  });
}

/** Best rated first, an unrated service after every rated one, then the most popular. */
export function byRating<T extends { rating: number | null; rating_count: number; popularity?: number }>(a: T, b: T): number {
  if ((a.rating === null) !== (b.rating === null)) return a.rating === null ? 1 : -1;
  return (b.rating ?? 0) - (a.rating ?? 0) || b.rating_count - a.rating_count || (b.popularity ?? 0) - (a.popularity ?? 0);
}
