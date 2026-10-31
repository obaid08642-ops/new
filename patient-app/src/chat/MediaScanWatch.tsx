import React, { useEffect } from 'react';
import { ScanStatusBadge } from '../components/ScanStatusBadge';
import { useScanGate } from '../hooks/useScanGate';
import { apiFetch } from '../utils/api';
import type { ScanProbeResult, ScanState } from '../utils/scanStatus';

/** Opens a chat attachment's link and reports only what the scan gate needs (423 `file_pending_scan`, 400 `file_infected`, else ready). */
export async function probeMedia(mediaId: string): Promise<ScanProbeResult> {
  try {
    await apiFetch(`/media/${encodeURIComponent(mediaId)}/url`);
    return { status: 200 };
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    if (message === 'file_pending_scan') return { status: 423, body: { message } };
    if (message === 'file_infected') return { status: 400, body: { message } };
    return { status: 503 };
  }
}

/**
 * Under an attachment that is still being scanned: "being checked" with a spinner, asked again every retry_after_seconds and when the app
 * comes back to the foreground (useScanGate). Reports 'ok' (tap to open) or 'rejected' once it is decided. A 423 is a normal state.
 */
export function MediaScanWatch({ mediaId, onState }: { mediaId: string; onState: (state: ScanState) => void }) {
  const state = useScanGate(() => probeMedia(mediaId), 'pending');
  useEffect(() => {
    if (state !== 'pending') onState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return <ScanStatusBadge state={state} testID={`chat-scan-${mediaId}`} />;
}
