import { scanStateOfUpload, type ScanState } from './scanStatus';

/**
 * What the upload answered for each stored file in this session (UPLOAD_SCAN=defer): `pending_scan` while the scan has not passed.
 * The id is the storage or media id the upload returned. A screen that shows the file asks `scanOfStored(id)`.
 */
const states = new Map<string, ScanState>();

export function noteUploadScan(id: unknown, body: unknown): ScanState {
  const state = scanStateOfUpload(body);
  if (typeof id === 'string' && id) {
    if (state === 'ok') states.delete(id); else states.set(id, state);
  }
  return state;
}

export const scanOfStored = (id: string | null | undefined): ScanState => (id ? states.get(id) ?? 'ok' : 'ok');

/** Forget a file (the scan passed, or the screen no longer shows it). */
export const clearStoredScan = (id: string): void => { states.delete(id); };

/** The scan state carried by a failed request: 400 `file_infected` is rejected; 423 is pending; anything else is an ordinary error (null). */
export function scanStateOfRequestError(error: unknown): ScanState | null {
  const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response;
  if (!response) return null;
  if (response.status === 423) return 'pending';
  return scanStateOfUpload(response.data) === 'rejected' ? 'rejected' : null;
}
