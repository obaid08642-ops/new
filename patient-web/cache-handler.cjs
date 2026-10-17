// P14.10 Next.js on more than one instance: the ISR/data cache in Redis, shared by every web instance.
//
// Off by default (one instance keeps Next's own file cache). A build with NEXT_CACHE_HANDLER=redis uses this handler
// (next.config.ts), with Next's in-memory cache turned off so no instance keeps a copy the others cannot invalidate.
// At run time NEXT_CACHE_REDIS_URL points at Redis (redis://:password@redis:6379).
//
// - Keys are per build (the BUILD_ID next to server/), so two releases never read each other's entries.
// - An entry is { value, lastModified, tags }; Buffers and Maps in Next's values (RSC payloads, segment data) are
//   encoded so they come back as they were.
// - Tags: each entry key is added to a Redis set per tag; revalidateTag deletes every key of the tag, on every
//   instance at once (the 14.10 "invalidation is consistent across instances"), and the time of the revalidation is kept
//   per tag. A page entry is judged by the tags of the fetches it used (its x-next-cache-tags header): Next keeps that
//   judgement in a manifest inside each process, which the other instances never see, so get() answers a miss for an
//   entry older than a revalidation of any of its tags, and every instance renders the new content.
// - Redis down or slow (500 ms): this instance falls back to a small in-process cache, so pages are still served
//   (each instance on its own until Redis is back), never an error page because of the cache.
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { createClient, commandOptions } = require("redis");

const TIMEOUT_MS = Number(process.env.NEXT_CACHE_REDIS_TIMEOUT_MS || 500);
// #1603: an entry nobody asks for in a week is not worth its memory (the Redis instance is capped and evicts the least
// recently used anyway; this is the upper bound for a page nobody evicted).
const ENTRY_TTL_SECONDS = Number(process.env.NEXT_CACHE_TTL_SECONDS || 7 * 86_400);
const LOCAL_MAX = 500;

let client = null;
let connecting = null;

function redis() {
  const url = process.env.NEXT_CACHE_REDIS_URL;
  if (!url) return Promise.resolve(null);
  if (client?.isReady) return Promise.resolve(client);
  if (!connecting) {
    const c = createClient({ url, socket: { connectTimeout: 2000, reconnectStrategy: (n) => Math.min(n * 200, 5000) } });
    c.on("error", () => {}); // reconnects on its own; callers fall back while it is down
    connecting = c.connect().then(() => { client = c; return c; }).catch(() => null).finally(() => { connecting = null; });
  }
  return connecting;
}

function withTimeout(promise) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("redis timeout")), TIMEOUT_MS); })])
    .finally(() => clearTimeout(timer));
}

/** JSON with Buffers ({ $b: base64 }) and Maps ({ $m: entries }) kept. */
function encode(entry) {
  return JSON.stringify(entry, function replacer(key, value) {
    const raw = this[key];
    if (raw instanceof Map) return { $m: [...raw.entries()] };
    if (value && value.type === "Buffer" && Array.isArray(value.data)) return { $b: Buffer.from(value.data).toString("base64") };
    return value;
  });
}
function decode(text) {
  return JSON.parse(text, (_key, value) => {
    if (value && typeof value === "object" && typeof value.$b === "string" && Object.keys(value).length === 1) return Buffer.from(value.$b, "base64");
    if (value && typeof value === "object" && Array.isArray(value.$m) && Object.keys(value).length === 1) return new Map(value.$m);
    return value;
  });
}

/**
 * #1603: entries are stored gzip-compressed. A page entry is HTML plus its RSC payload (base64 in the JSON), which
 * compresses about 5x: the capped cache instance holds five times as many pages. Level 1: about 1 ms for a page.
 */
function pack(entry) {
  return zlib.gzipSync(Buffer.from(encode(entry)), { level: 1 });
}
function unpack(buf) {
  const raw = Buffer.isBuffer(buf) ? buf : Buffer.from(String(buf));
  const gz = raw.length > 2 && raw[0] === 0x1f && raw[1] === 0x8b;
  return decode((gz ? zlib.gunzipSync(raw) : raw).toString("utf8"));
}

function buildId(options) {
  try {
    return fs.readFileSync(path.join(options.serverDistDir || ".next/server", "..", "BUILD_ID"), "utf8").trim();
  } catch {
    return "dev";
  }
}

class RedisCacheHandler {
  constructor(options = {}) {
    this.prefix = `${process.env.NEXT_CACHE_REDIS_PREFIX || "nabd:next"}:${buildId(options)}`;
    this.local = new Map();
  }

  key(k) { return `${this.prefix}:e:${k}`; }
  tagKey(t) { return `${this.prefix}:t:${t}`; }
  revalidatedKey(t) { return `${this.prefix}:x:${t}`; }

  /** Every tag an entry depends on: its own, the fetch tags in a page's header, and what Next passes for this read. */
  static tagsOf(entry, ctx = {}) {
    const header = entry?.value?.headers?.["x-next-cache-tags"];
    return [...new Set([...(entry?.tags || []), ...(typeof header === "string" ? header.split(",") : []), ...(ctx.tags || []), ...(ctx.softTags || [])].filter(Boolean))];
  }

  rememberLocally(key, entry) {
    this.local.delete(key);
    this.local.set(key, entry);
    while (this.local.size > LOCAL_MAX) this.local.delete(this.local.keys().next().value);
  }

  async get(key, ctx = {}) {
    try {
      const r = await withTimeout(redis());
      if (r) {
        const stored = await withTimeout(r.get(commandOptions({ returnBuffers: true }), this.key(key)));
        if (!stored) return null;
        const entry = unpack(stored);
        const tags = RedisCacheHandler.tagsOf(entry, ctx);
        if (tags.length) {
          const times = await withTimeout(r.mGet(tags.map((t) => this.revalidatedKey(t))));
          if (times.some((t) => t && Number(t) > (entry.lastModified || 0))) return null;
        }
        return entry;
      }
    } catch { /* fall through to the local copy */ }
    return this.local.get(key) || null;
  }

  async set(key, data, ctx = {}) {
    const tags = Array.isArray(ctx.tags) ? ctx.tags : [];
    const entry = { value: data, lastModified: Date.now(), tags };
    this.rememberLocally(key, entry);
    try {
      const r = await withTimeout(redis());
      if (!r) return;
      const multi = r.multi().set(this.key(key), pack(entry), { EX: ENTRY_TTL_SECONDS });
      for (const tag of tags) multi.sAdd(this.tagKey(tag), key).expire(this.tagKey(tag), ENTRY_TTL_SECONDS);
      await withTimeout(multi.exec());
    } catch { /* the local copy is kept; Redis gets it on the next set */ }
  }

  async revalidateTag(tagOrTags) {
    const tags = [tagOrTags].flat().filter((t) => typeof t === "string");
    for (const [key, entry] of this.local) if (entry.tags?.some((t) => tags.includes(t))) this.local.delete(key);
    try {
      const r = await withTimeout(redis());
      if (!r) return;
      const now = String(Date.now());
      for (const tag of tags) {
        await withTimeout(r.set(this.revalidatedKey(tag), now, { EX: ENTRY_TTL_SECONDS }));
        const keys = await withTimeout(r.sMembers(this.tagKey(tag)));
        const del = keys.map((k) => this.key(k));
        await withTimeout(r.del([...del, this.tagKey(tag)]));
      }
    } catch { /* a revalidation that could not reach Redis: entries expire on their own revalidate window */ }
  }

  resetRequestCache() {}
}

module.exports = RedisCacheHandler;
module.exports.encode = encode;
module.exports.decode = decode;
module.exports.pack = pack;
module.exports.unpack = unpack;
