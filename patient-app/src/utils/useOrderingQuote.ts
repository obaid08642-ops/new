import { useCallback, useEffect, useState } from 'react';

import { isOffline } from './isOffline';
import { logError } from './logger';
import { orderingErrorKey, requestQuote, type FromPrice, type OrderingContextBody, type OrderingKind, type OrderingSort, type Quote } from './ordering';

/** A quote for the items in the context; asked again when the items or the context change. `items` empty or no context: idle. */
export function useOrderingQuote(kind: OrderingKind, items: string[], body: OrderingContextBody | null, sort?: OrderingSort) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error' | 'offline'>('idle');
  const [errorKey, setErrorKey] = useState('ordering.err.generic');
  const key = JSON.stringify([kind, [...items].sort(), body, sort]);

  const load = useCallback(async () => {
    if (items.length === 0 || !body) {
      setQuote(null);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    try {
      setQuote(await requestQuote({ service_kind: kind, items, context: body, sort }));
      setStatus('ready');
    } catch (err) {
      logError('ordering:quote', err);
      setErrorKey(orderingErrorKey(err));
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  return { quote, status, errorKey, reload: load };
}

/**
 * "From X SAR · n providers" of a few catalogue items in the context: one quote per item, one after the other (the quote is
 * rate-limited), an item whose quote fails simply has no line. Asked again when the context or the items change.
 */
export function useFromPrices(kind: OrderingKind, ids: string[], body: OrderingContextBody | null): Record<string, FromPrice | null> {
  const [out, setOut] = useState<Record<string, FromPrice | null>>({});
  const key = JSON.stringify([kind, ids, body]);
  useEffect(() => {
    let live = true;
    setOut({});
    if (!body) return undefined;
    (async () => {
      for (const id of ids) {
        try {
          const quote = await requestQuote({ service_kind: kind, items: [id], context: body });
          if (live) setOut((o) => ({ ...o, [id]: quote.from_price }));
        } catch (err) {
          logError('ordering:from-price', err);
        }
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return out;
}
