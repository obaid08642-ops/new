const CACHEABLE_PATHS = ['/api/v1/medicines', '/api/v1/lab-services', '/api/v1/radiology', '/api/v1/care/services', '/api/v1/home-care/services'];
const PRIVATE_PATHS = ['/api/v1/auth', '/api/v1/orders', '/api/v1/bookings', '/api/v1/wallet'];
const CACHE_TTL = { '/api/v1/medicines': 300, '/api/v1/lab-services': 900, '/api/v1/radiology': 900, '/api/v1/care/services': 900, '/api/v1/home-care/services': 900 };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return fetch(request);
    if (PRIVATE_PATHS.some(p => url.pathname.startsWith(p))) return fetch(request);
    const matched = CACHEABLE_PATHS.find(p => url.pathname.startsWith(p));
    if (!matched) return fetch(request);
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { headers: { 'Accept': request.headers.get('Accept') || '', 'Accept-Language': request.headers.get('Accept-Language') || '' } });
    const cached = await cache.match(cacheKey);
    if (cached) {
      const r = new Response(cached.body, cached);
      r.headers.set('X-Cache', 'HIT');
      r.headers.set('X-Cache-Source', 'Cloudflare-Worker');
      return r;
    }
    const origin = await fetch(request);
    if (origin.ok) {
      const ttl = CACHE_TTL[matched] || 300;
      const toCache = new Response(origin.clone().body, { status: origin.status, headers: { ...Object.fromEntries(origin.headers.entries()), 'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`, 'X-Cache': 'MISS', 'X-Cache-Source': 'Cloudflare-Worker' } });
      ctx.waitUntil(cache.put(cacheKey, toCache));
    }
    return origin;
  },
};
