import React, { useCallback } from 'react';
import client from '../api/client';
import { useScanGate } from '../hooks/useScanGate';
import { clearStoredScan, scanOfStored } from '../utils/scanRegistry';
import type { ScanProbeResult } from '../utils/scanStatus';
import { ScanStatusBadge } from './ScanStatusBadge';

/** Opens a stored file's signed link and reports only what the scan gate needs. A 423 is a normal answer here, never an error. */
export async function probeSignedUrl(id: string): Promise<ScanProbeResult> {
  try {
    const r: any = await client.get(`/storage/${encodeURIComponent(id)}/signed-url`);
    return { status: typeof r?.status === 'number' ? r.status : 200, body: r?.data };
  } catch (e) {
    const response = (e as { response?: { status?: number; data?: unknown } } | null)?.response;
    return { status: response?.status ?? 503, body: response?.data };
  }
}

/**
 * "Being checked for safety" under a stored file that has not passed its scan yet (what its upload answered, or a 423 when its
 * link was asked for). Asks again every retry_after_seconds and when the app is foregrounded; shows nothing once the file is ok.
 */
export function StoredFileScan({ id, onReupload, style }: { id: string; onReupload?: () => void; style?: object }) {
  const initial = scanOfStored(id);
  const probe = useCallback(() => probeSignedUrl(id), [id]);
  const state = useScanGate(initial === 'pending' ? probe : null, initial);
  if (state === 'ok' && initial === 'pending') clearStoredScan(id);
  return <ScanStatusBadge state={state} onReupload={onReupload} style={style} />;
}
