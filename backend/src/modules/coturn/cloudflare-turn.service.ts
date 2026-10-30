import { Logger } from '@nestjs/common';

export interface IceServer { urls: string[]; username?: string; credential?: string }

/** How long one issued credential lives (about a call), and how long a user's credential is reused before a new one is asked for. */
export const CF_TURN_TTL_SECONDS = 3600;
export const CF_TURN_CACHE_MS = 5 * 60_000;
const CF_TIMEOUT_MS = 3000;
const CF_ENDPOINT = 'https://rtc.live.cloudflare.com/v1/turn/keys';

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * Cloudflare Realtime TURN (turn.cloudflare.com: TLS on 443, UDP/TCP on 3478): short-lived credentials made on the server with the TURN key,
 * so only the credential (never CF_TURN_API_TOKEN) reaches a client. Credentials are cached per user for a few minutes; when Cloudflare is
 * not configured, slow or down, the answer is an empty list and the caller falls back to our own coturn.
 */
export class CloudflareTurnService {
  private readonly logger = new Logger('CloudflareTurn');
  private readonly cache = new Map<string, { at: number; servers: IceServer[] }>();

  constructor(private readonly fetchImpl: FetchLike = ((u, i) => fetch(u, i)) as FetchLike, private readonly now: () => number = Date.now) {}

  /** CALLS_TURN_PROVIDER=coturn drops Cloudflare (our own coturn only) with an env change and a restart, no deploy; unset or `cloudflare` = Cloudflare first, coturn second. */
  isConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
    return !!env.CF_TURN_KEY_ID && !!env.CF_TURN_API_TOKEN && String(env.CALLS_TURN_PROVIDER || 'cloudflare').trim().toLowerCase() !== 'coturn';
  }

  /** ICE servers for this user, or [] (not configured / Cloudflare failed). Never throws. */
  async iceServers(userId: string): Promise<IceServer[]> {
    if (!this.isConfigured()) return [];
    const hit = this.cache.get(userId);
    if (hit && this.now() - hit.at < CF_TURN_CACHE_MS) return hit.servers;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), CF_TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${CF_ENDPOINT}/${encodeURIComponent(String(process.env.CF_TURN_KEY_ID))}/credentials/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CF_TURN_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: CF_TURN_TTL_SECONDS }),
        signal: ctl.signal,
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body: any = await res.json();
      const entry = body?.iceServers;
      const list: any[] = Array.isArray(entry) ? entry : entry ? [entry] : [];
      const servers = list
        .filter((s) => Array.isArray(s?.urls) && s.urls.length && typeof s.username === 'string' && typeof s.credential === 'string')
        .map((s) => ({ urls: s.urls as string[], username: s.username as string, credential: s.credential as string }));
      if (!servers.length) throw new Error('no usable ice server in the answer');
      this.cache.set(userId, { at: this.now(), servers });
      if (this.cache.size > 5000) for (const k of this.cache.keys()) { this.cache.delete(k); if (this.cache.size <= 4000) break; }
      return servers;
    } catch (e) {
      // the message never carries the token (it is only in the request header)
      this.logger.warn(`Cloudflare TURN unavailable, using coturn only: ${(e as Error).message}`);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
}

export const cloudflareTurn = new CloudflareTurnService();
