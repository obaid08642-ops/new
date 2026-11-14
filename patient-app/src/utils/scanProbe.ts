import { apiFetch } from './api';
import type { ScanProbeResult } from './scanStatus';

/** The API path of a stored file's address (`/api/v1/storage/:id` becomes `/storage/:id`); null for anything that is not one of ours. */
export function storedFilePath(url: string | null | undefined): string | null {
  const m = typeof url === 'string' ? /^\/api\/v\d+(\/[A-Za-z0-9_\-./]+)$/.exec(url) : null;
  return m ? m[1] : null;
}

/**
 * Opens a stored file through the API and reports only what the scan gate needs. apiFetch throws `Error(message)` for a non-2xx
 * (423 `file_pending_scan`, 400 `file_infected`), and a 2xx body that is not JSON (the file's bytes) is its 'invalid_response'.
 * Nothing is logged here: a 423 is a normal state.
 */
export async function probeStoredFile(path: string): Promise<ScanProbeResult> {
  try {
    await apiFetch(path);
    return { status: 200 };
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    if (message === 'invalid_response') return { status: 200 };
    if (message === 'file_pending_scan') return { status: 423, body: { message } };
    if (message === 'file_infected') return { status: 400, body: { message } };
    return { status: 503 };
  }
}
