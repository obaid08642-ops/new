/**
 * In-memory Redis for HTTP e2e specs: the command subset the auth/session
 * code uses (get/set with EX/NX, del, sadd/srem/smembers, expire) plus the
 * RedisService helpers built on it. TTLs are accepted and ignored.
 */
export function makeRedis() {
  const kv = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const client = {
    async get(k: string) { return kv.has(k) ? kv.get(k)! : null; },
    async set(k: string, v: string, ...args: any[]) {
      if (args.includes('NX') && kv.has(k)) return null;
      kv.set(k, String(v));
      return 'OK';
    },
    async del(...keys: string[]) {
      let n = 0;
      for (const k of keys) { if (kv.delete(k)) n++; if (sets.delete(k)) n++; }
      return n;
    },
    async sadd(k: string, ...m: string[]) {
      const s = sets.get(k) || new Set<string>();
      m.forEach((x) => s.add(x));
      sets.set(k, s);
      return m.length;
    },
    async srem(k: string, ...m: string[]) { const s = sets.get(k); m.forEach((x) => s?.delete(x)); return m.length; },
    async smembers(k: string) { return [...(sets.get(k) || [])]; },
    async expire() { return 1; },
  };
  const service = {
    getClient: () => client,
    async getJson<T>(k: string): Promise<T | null> { const v = await client.get(k); return v ? JSON.parse(v) : null; },
    async setJson(k: string, v: unknown) { await client.set(k, JSON.stringify(v)); },
    async del(k: string) { await client.del(k); },
    async checkRateLimit() { return { allowed: true, remaining: 99 }; },
  };
  return { client, service, kv, sets };
}
