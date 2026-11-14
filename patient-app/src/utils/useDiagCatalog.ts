import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchPublicList } from './publicCache';
import { catalogPath, hasMorePages, parseCatalogPage, DIAG_PAGE_SIZE, type CatalogQuery } from './diagCatalogApi';
import { isOffline } from './isOffline';
import { logError } from './logger';
import { normalizeLabList, type CatalogItem } from './labMappers';
import type { DiagKind } from '../../../packages/ui/icons/diag-art';

export interface DiagCatalog {
  items: CatalogItem[];
  /** The first page is loading (or the filters changed and page 1 is loading again). */
  loading: boolean;
  /** A later page is loading. */
  loadingMore: boolean;
  hasMore: boolean;
  /** The server's `total` for the current search / sort / category (null for a plain-array answer). */
  total: number | null;
  failed: 'error' | 'offline' | null;
  loadMore: () => void;
  reload: () => void;
}

type Params = Omit<CatalogQuery, 'page'>;

/**
 * One kind's catalogue, a server page at a time. A change of search, sort, category or home visit starts again at page 1; `loadMore`
 * appends the next page (rows seen already are dropped). A late answer of an older request is ignored.
 */
export function useDiagCatalog(kind: DiagKind, enabled: boolean, params: Params): DiagCatalog {
  const key = JSON.stringify(params);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [more, setMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [failed, setFailed] = useState<DiagCatalog['failed']>(null);
  const page = useRef(0);
  const token = useRef(0);
  const busy = useRef(false);
  const latest = useRef(params);
  latest.current = params;

  const fail = useCallback(async (err: unknown) => {
    logError('diagnostics:catalog', err);
    return (await isOffline()) ? 'offline' : 'error';
  }, []);

  const loadFirst = useCallback(async () => {
    const mine = ++token.current;
    busy.current = true;
    setLoading(true);
    setLoadingMore(false);
    setFailed(null);
    try {
      const limit = latest.current.limit ?? DIAG_PAGE_SIZE;
      const res = parseCatalogPage(await fetchPublicList<unknown>(catalogPath(kind, { ...latest.current, page: 1 })));
      if (mine !== token.current) return;
      page.current = 1;
      setItems(normalizeLabList(res.rows));
      setMore(hasMorePages(res, 1, limit));
      setTotal(res.total);
    } catch (err) {
      const why = await fail(err);
      if (mine !== token.current) return;
      setItems([]);
      setMore(false);
      setTotal(null);
      setFailed(why);
    } finally {
      if (mine === token.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, [kind, fail]);

  useEffect(() => {
    if (!enabled) return;
    void loadFirst();
    // the params are compared by value through `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, loadFirst]);

  const loadMore = useCallback(() => {
    if (busy.current || !more || page.current < 1) return;
    const mine = token.current;
    const next = page.current + 1;
    busy.current = true;
    setLoadingMore(true);
    void (async () => {
      try {
        const limit = latest.current.limit ?? DIAG_PAGE_SIZE;
        const res = parseCatalogPage(await fetchPublicList<unknown>(catalogPath(kind, { ...latest.current, page: next })));
        if (mine !== token.current) return;
        page.current = next;
        setItems((current) => {
          const seen = new Set(current.map((x) => x.id));
          return [...current, ...normalizeLabList(res.rows).filter((x) => !seen.has(x.id))];
        });
        setMore(hasMorePages(res, next, limit));
      } catch (err) {
        logError('diagnostics:catalog', err);
        if (mine === token.current) setMore(false);
      } finally {
        if (mine === token.current) {
          busy.current = false;
          setLoadingMore(false);
        }
      }
    })();
  }, [kind, more]);

  return { items, loading, loadingMore, hasMore: more, total, failed, loadMore, reload: () => void loadFirst() };
}
