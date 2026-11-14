import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { createScanGate, type ScanProbeResult, type ScanState } from '../utils/scanStatus';

/**
 * The scan state of one file (UPLOAD_SCAN=defer). `initial` comes from the upload response (scanStateOfUpload) or from the 423
 * answer to opening it. While it is 'pending' the file is probed every retry_after_seconds and when the app comes back to the
 * foreground; the timer stops on unmount. A 423 is never an error here: nothing is thrown, logged or shown as one.
 */
export function useScanGate(probe: (() => Promise<ScanProbeResult>) | null, initial: ScanState = 'ok'): ScanState {
  const [state, setState] = useState<ScanState>(initial);
  const probeRef = useRef(probe);
  probeRef.current = probe;
  const [previous, setPrevious] = useState(initial);
  if (previous !== initial) {
    setPrevious(initial);
    setState(initial);
  }

  useEffect(() => {
    if (state !== 'pending' || !probeRef.current) return;
    const gate = createScanGate({
      initial: 'pending',
      probe: () => (probeRef.current ? probeRef.current() : Promise.resolve({ status: 423 })),
      onChange: setState,
    });
    const sub = AppState.addEventListener('change', (next) => { if (next === 'active') gate.refresh(); });
    gate.start();
    return () => {
      sub.remove();
      gate.stop();
    };
  }, [state]);

  return state;
}
