import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';

import { logError } from '../../utils/logger';
import { Notice } from '../health/HealthKit';
import { useScreenUi } from './ScreenKit';

/**
 * Copy a code or a link to the clipboard and tell the person the truth: "Copied" only after the clipboard accepted the
 * text, an error notice when it did not (the text stays selectable on the screen). `notice` is drawn under the buttons.
 */
export function useCopy(scope: string) {
  const { k } = useScreenUi();
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = useCallback(async (text: string) => {
    if (!text) return;
    if (timer.current) clearTimeout(timer.current);
    try {
      const ok = await Clipboard.setStringAsync(text);
      setState(ok === false ? 'failed' : 'copied');
      if (ok === false) logError(`${scope}:copy`, new Error('clipboard refused'));
    } catch (e) {
      logError(`${scope}:copy`, e);
      setState('failed');
    }
    timer.current = setTimeout(() => setState('idle'), 3000);
  }, [scope]);

  const notice =
    state === 'copied' ? <Notice tone="success" text={k('common.copied')} testID={`${scope}-copied`} />
    : state === 'failed' ? <Notice tone="danger" text={k('common.copyFailed')} testID={`${scope}-copy-failed`} />
    : null;
  return { copy, notice };
}
