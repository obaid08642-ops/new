/**
 * 15.1 — screen-close cancellation.
 *
 * `apiFetch` accepts an `AbortSignal` (it is part of the `RequestInit` options it
 * already took). This hook supplies one that is aborted when the screen unmounts,
 * so navigating away tears the request down instead of resolving into a tree that
 * no longer exists.
 *
 * Usage:
 *   const signal = useRequestSignal();
 *   useEffect(() => { void load(signal); }, [signal]);
 *   // or: apiFetch('/orders', { signal })
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface RequestSignalHandle {
  /** Pass to `apiFetch(endpoint, { signal })`. */
  signal: AbortSignal;
  /** Abort now, without unmounting (e.g. the user hit "refresh"). */
  abort: () => void;
  /** True once the screen is gone or `abort()` was called. */
  isAborted: () => boolean;
}

export function useRequestSignal(deps: unknown[] = []): RequestSignalHandle {
  const controllerRef = useRef<AbortController | null>(null);
  if (controllerRef.current == null) controllerRef.current = new AbortController();

  const handle = useMemo<RequestSignalHandle>(
    () => ({
      get signal() {
        return controllerRef.current!.signal;
      },
      abort: () => controllerRef.current?.abort(),
      isAborted: () => controllerRef.current?.signal.aborted === true,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    return () => {
      // The screen is closing: any request still in flight is now pointless.
      controller.abort();
    };
  }, deps);

  return handle;
}

/**
 * Run an async loader once per mount and abort it on unmount.
 *
 * The `cancelled` flag is still checked before every `setState`: aborting stops
 * the network work, but a promise that already resolved can still land after
 * unmount, and that is the classic "setState on an unmounted component" warning.
 */
export function useAbortableEffect(
  effect: (signal: AbortSignal) => Promise<void> | void,
  deps: unknown[] = [],
): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const callback = useCallback(effect, deps);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      await callback(controller.signal);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [callback]);
}
