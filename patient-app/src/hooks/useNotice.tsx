// 15.3 — a short message at the bottom of the screen (a toast), for "that change was undone".
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Toast } from '../../../packages/ui-native/src';

const SHOWN_MS = 4000;

/** `show(message)` displays the toast for four seconds; render `node` once in the screen. */
export function useNotice(theme: 'light' | 'dark') {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const show = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), SHOWN_MS);
  }, []);
  const node = message ? <Toast message={message} tone="danger" theme={theme} testID="notice-toast" /> : null;
  return { show, node };
}
