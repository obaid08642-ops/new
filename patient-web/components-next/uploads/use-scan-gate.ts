"use client";

import { useEffect, useRef, useState } from "react";
import { createScanGate, type ScanProbeResult, type ScanState } from "@/lib/uploads/scan-status";

/**
 * The scan state of one file. `initial` comes from the upload response (scanStateOfUpload) or from a 423 on opening. While it is
 * 'pending' the file is probed every retry_after_seconds and when the tab is focused or visible again; the timer stops on unmount.
 * A 423 is never an error here: nothing is thrown, logged or toasted.
 */
export function useScanGate(probe: (() => Promise<ScanProbeResult>) | null, initial: ScanState = "ok"): ScanState {
  const [state, setState] = useState<ScanState>(initial);
  const probeRef = useRef(probe);
  probeRef.current = probe;
  const [previous, setPrevious] = useState(initial);
  if (previous !== initial) { setPrevious(initial); setState(initial); }

  useEffect(() => {
    if (state !== "pending" || !probeRef.current) return;
    const gate = createScanGate({
      initial: "pending",
      probe: () => (probeRef.current ? probeRef.current() : Promise.resolve({ status: 423 })),
      onChange: setState,
    });
    const onWake = () => { if (document.visibilityState === "visible") gate.refresh(); };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    gate.start();
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      gate.stop();
    };
  }, [state]);

  return state;
}
