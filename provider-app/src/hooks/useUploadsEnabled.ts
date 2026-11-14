import { useEffect, useState } from 'react';
import client from '../api/client';

const TTL_MS = 60_000;
let cached: { value: boolean; at: number } | null = null;
let inflight: Promise<boolean> | null = null;

/** Backend `features.uploads_enabled` (false while the virus scanner is down). Fails open. */
export function loadUploadsEnabled(): Promise<boolean> {
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.value);
  if (inflight) return inflight;
  inflight = (async () => {
    let value = true;
    try {
      const res: any = await client.get('/config');
      const body = res?.data || res;
      value = body?.features?.uploads_enabled !== false;
    } catch {
      value = true;
    }
    cached = { value, at: Date.now() };
    return value;
  })().finally(() => { inflight = null; });
  return inflight;
}

export function resetUploadsEnabledCache() {
  cached = null;
  inflight = null;
}

export function useUploadsEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(cached ? cached.value : true);
  useEffect(() => {
    let alive = true;
    void loadUploadsEnabled().then((v) => { if (alive) setEnabled(v); });
    return () => { alive = false; };
  }, []);
  return enabled;
}
