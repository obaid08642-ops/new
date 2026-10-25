import { useEffect, useState } from 'react';

import { apiFetch } from '../../utils/api';

/**
 * Which social providers the BACKEND can finish, and their public client ids (GET /auth/social/config). The apps used to read
 * EXPO_PUBLIC_* values inlined at build time, and a build without them hid or broke the buttons. The build values stay only as
 * the fallback while this answer is missing (older backend, offline).
 */
export interface SocialProviderRuntime { enabled: boolean; client_id?: string; ios_client_id?: string; android_client_id?: string; redirect_uri?: string }
export interface SocialRuntimeConfig { google: SocialProviderRuntime; apple: SocialProviderRuntime; x: SocialProviderRuntime; snapchat: SocialProviderRuntime }

const KEYS = ['google', 'apple', 'x', 'snapchat'] as const;
const TTL_MS = 5 * 60 * 1000;
let cached: { at: number; value: SocialRuntimeConfig } | null = null;

const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** The answer, or null when it is not the expected shape (so the build-time fallback applies). */
export function parseSocialRuntime(payload: unknown): SocialRuntimeConfig | null {
  const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  if (!root || !KEYS.some((k) => k in root)) return null;
  const out = {} as SocialRuntimeConfig;
  for (const key of KEYS) {
    const entry = root[key] && typeof root[key] === 'object' ? (root[key] as Record<string, unknown>) : {};
    out[key] = {
      enabled: entry.enabled === true,
      client_id: text(entry.client_id),
      ios_client_id: text(entry.ios_client_id),
      android_client_id: text(entry.android_client_id),
      redirect_uri: text(entry.redirect_uri),
    };
  }
  return out;
}

export function useSocialConfig(): SocialRuntimeConfig | null {
  const [config, setConfig] = useState<SocialRuntimeConfig | null>(cached && Date.now() - cached.at < TTL_MS ? cached.value : null);
  useEffect(() => {
    if (cached && Date.now() - cached.at < TTL_MS) return;
    let live = true;
    (async () => {
      try {
        const value = parseSocialRuntime(await apiFetch('/auth/social/config', { skipAuth: true }));
        if (!value) return;
        cached = { at: Date.now(), value };
        if (live) setConfig(value);
      } catch {
        // offline or an older backend: the build-time fallback stays
      }
    })();
    return () => { live = false; };
  }, []);
  return config;
}

/** Test seam: forget the cached answer. */
export function resetSocialConfigCache() { cached = null; }
