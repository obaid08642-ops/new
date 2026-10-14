// F82-3: the nonce server in front of the static/ISR public pages (server/nonce-server.mjs), and its compression (F68
// follow-up, #293 review: assets keep their own compression, the documents it rewrites are compressed here).
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import zlib from "node:zlib";
import { handler, pickEncoding, EDGE_STAMP_HEADER } from "../server/nonce-server.mjs";
import { CSP_INJECT_HEADER, CSP_NONCE_PLACEHOLDER, contentSecurityPolicy } from "../lib/security/csp";
import { UNAVAILABLE_FALLBACK_HEADER } from "../lib/security/query-twin";

const PLACEHOLDER_POLICY = contentSecurityPolicy(CSP_NONCE_PLACEHOLDER, false);
const PAGE = '<html><head><script>self.__next_f=[]</script></head><body><p>page</p></body></html>';
const FALLBACK_PAGE = '<html><head><script>self.__next_f=[]</script></head><body><p>unavailable</p></body></html>';

type Seen = { url?: string; headers: http.IncomingHttpHeaders }[];

const closers: Array<() => void> = [];
afterEach(() => { while (closers.length) closers.pop()!(); });

async function start(upstream: http.RequestListener, options: { edgeToken?: string } = {}) {
  const seen: Seen = [];
  const next = http.createServer((req, res) => { seen.push({ url: req.url, headers: req.headers }); upstream(req, res); });
  await new Promise<void>((resolve) => next.listen(0, "127.0.0.1", resolve));
  const front = http.createServer(handler((next.address() as AddressInfo).port, options));
  await new Promise<void>((resolve) => front.listen(0, "127.0.0.1", resolve));
  closers.push(() => { front.close(); next.close(); });
  return { base: `http://127.0.0.1:${(front.address() as AddressInfo).port}`, seen };
}

const html = (res: http.ServerResponse, status: number, body: string, extra: Record<string, string> = {}) => {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8", "content-security-policy": PLACEHOLDER_POLICY, [CSP_INJECT_HEADER]: "1", ...extra });
  res.end(body);
};
const nonceOf = (response: Response) => /'nonce-([^']+)'/.exec(response.headers.get("content-security-policy") || "")?.[1];

describe("a public page that failed and has no cached copy", () => {
  // Next answers 5xx (text/plain) when a static page cannot be made and there is nothing to keep serving.
  const failing: http.RequestListener = (req, res) => {
    if (req.headers[UNAVAILABLE_FALLBACK_HEADER] === "1") return html(res, 200, FALLBACK_PAGE, { "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate" });
    res.writeHead(500, { "content-type": "text/plain", [CSP_INJECT_HEADER]: "1" });
    res.end("Internal Server Error");
  };

  it("is answered with the unavailable page at the same URL: 503, Retry-After, never cached, a fresh nonce on its scripts", async () => {
    const { base, seen } = await start(failing);
    const a = await fetch(`${base}/ar/c`, { headers: { accept: "text/html" } });
    const b = await fetch(`${base}/ar/c`, { headers: { accept: "text/html" } });
    const text = await a.text();
    expect(a.status).toBe(503);
    expect(a.headers.get("retry-after")).toBe("30");
    expect(a.headers.get("cache-control")).toContain("no-store");
    expect(a.headers.get("x-robots-tag")).toContain("noindex");
    expect(text).toContain("unavailable");
    expect(text).toContain(`<script nonce="${nonceOf(a)}">`);
    expect(nonceOf(a)).toBeTruthy();
    expect(nonceOf(a)).not.toBe(CSP_NONCE_PLACEHOLDER);
    expect(nonceOf(a)).not.toBe(nonceOf(b));
    expect(a.headers.get(CSP_INJECT_HEADER)).toBeNull();
    // the second request went to the same URL, with the fallback marker; the first one carried none
    expect(seen[0].headers[UNAVAILABLE_FALLBACK_HEADER]).toBeUndefined();
    expect(seen[1].url).toBe("/ar/c");
    expect(seen[1].headers[UNAVAILABLE_FALLBACK_HEADER]).toBe("1");
  });

  it("does not take the marker from a visitor, so nobody can ask Next for the unavailable page by hand", async () => {
    const { base, seen } = await start((_req, res) => html(res, 200, PAGE, { "cache-control": "s-maxage=60, stale-while-revalidate=31535940" }));
    await fetch(`${base}/ar`, { headers: { [UNAVAILABLE_FALLBACK_HEADER]: "1", accept: "text/html" } });
    expect(seen[0].headers[UNAVAILABLE_FALLBACK_HEADER]).toBeUndefined();
  });

  it("only for a page request: an RSC or JSON request keeps Next's own 5xx (the router then reloads the page)", async () => {
    const { base, seen } = await start(failing);
    const rsc = await fetch(`${base}/ar/c`, { headers: { accept: "text/x-component", rsc: "1" } });
    expect(rsc.status).toBe(500);
    const json = await fetch(`${base}/ar/c`, { headers: { accept: "application/json" } });
    expect(json.status).toBe(500);
    expect(seen).toHaveLength(2);
  });

  it("answers a plain 503 when the unavailable page itself cannot be had", async () => {
    const { base } = await start((_req, res) => { res.writeHead(500, { "content-type": "text/plain", [CSP_INJECT_HEADER]: "1" }); res.end("x"); });
    const r = await fetch(`${base}/ar`, { headers: { accept: "text/html" } });
    expect(r.status).toBe(503);
    expect(r.headers.get("cache-control")).toContain("no-store");
  });

  it("leaves a 5xx of a page the proxy did not mark (a private page) as it is", async () => {
    const { base } = await start((_req, res) => { res.writeHead(500, { "content-type": "text/html" }); res.end("<p>boom</p>"); });
    const r = await fetch(`${base}/ar/cart`, { headers: { accept: "text/html" } });
    expect(r.status).toBe(500);
    expect(await r.text()).toBe("<p>boom</p>");
  });
});

describe("a session, a twin or any answer the proxy made no-store", () => {
  it("is stamped, and the no-store is kept (it is not turned into a shared-cache-looking header)", async () => {
    const { base } = await start((_req, res) => html(res, 200, PAGE, { "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate" }));
    const r = await fetch(`${base}/ar`, { headers: { cookie: "nabd_access=a.b.c", accept: "text/html" } });
    expect(r.headers.get("cache-control")).toContain("no-store");
    expect(await r.text()).toContain(`<script nonce="${nonceOf(r)}">`);
  });

  it("a cacheable public page is stamped and `private, no-cache` (a nonce must never sit in a shared cache)", async () => {
    const { base } = await start((_req, res) => html(res, 200, PAGE, { "cache-control": "s-maxage=60, stale-while-revalidate=31535940" }));
    const r = await fetch(`${base}/ar`);
    expect(r.headers.get("cache-control")).toBe("private, no-cache");
    expect(r.headers.get("cache-control")).not.toContain("s-maxage");
  });
});

describe("edge mode (NABD_EDGE_STAMP_TOKEN)", () => {
  const cacheable: http.RequestListener = (_req, res) => html(res, 200, PAGE, { "cache-control": "s-maxage=60, stale-while-revalidate=31535940" });

  it("a trusted edge gets the page unstamped, with the placeholder policy and the cache headers an edge can honour", async () => {
    const { base } = await start(cacheable, { edgeToken: "s3cret" });
    const r = await fetch(`${base}/ar`, { headers: { [EDGE_STAMP_HEADER]: "s3cret" } });
    const body = await r.text();
    expect(r.headers.get("content-security-policy")).toContain(`'nonce-${CSP_NONCE_PLACEHOLDER}'`);
    expect(body).toBe(PAGE);
    expect(r.headers.get("cache-control")).toBe("s-maxage=60, stale-while-revalidate=31535940, stale-if-error=31536000");
    expect(r.headers.get(CSP_INJECT_HEADER)).toBeNull();
  });

  it("anyone else is stamped here and gets `private, no-cache`: a wrong token, no token, or no token configured", async () => {
    for (const [options, header] of [[{ edgeToken: "s3cret" }, "wrong"], [{ edgeToken: "s3cret" }, undefined], [{ edgeToken: "" }, ""]] as const) {
      const { base } = await start(cacheable, options);
      const r = await fetch(`${base}/ar`, { headers: header === undefined ? {} : { [EDGE_STAMP_HEADER]: header } });
      const body = await r.text();
      expect(nonceOf(r)).not.toBe(CSP_NONCE_PLACEHOLDER);
      expect(body).toContain(`<script nonce="${nonceOf(r)}">`);
      expect(r.headers.get("cache-control")).toBe("private, no-cache");
    }
  });

  it("the token is not passed on to Next", async () => {
    const { base, seen } = await start(cacheable, { edgeToken: "s3cret" });
    await fetch(`${base}/ar`, { headers: { [EDGE_STAMP_HEADER]: "s3cret" } });
    expect(seen[0].headers[EDGE_STAMP_HEADER]).toBeUndefined();
  });

  it("never lets the edge keep an answer the proxy made no-store (a session, an error)", async () => {
    const { base } = await start((_req, res) => html(res, 200, PAGE, { "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate" }), { edgeToken: "s3cret" });
    const r = await fetch(`${base}/ar`, { headers: { [EDGE_STAMP_HEADER]: "s3cret" } });
    expect(r.headers.get("cache-control")).toContain("no-store");
    expect(nonceOf(r)).not.toBe(CSP_NONCE_PLACEHOLDER);
  });
});

// Compression: the app answers a document uncompressed (this server may rewrite it), so documents are compressed here, br or
// gzip by the client's Accept-Encoding; assets, images, RSC and JSON keep their own Accept-Encoding and Next's compression
// passes through untouched. (Nginx in production compresses what is not yet compressed.)
describe("compression on the way out", () => {
  const ASSET = "console.log('chunk');".repeat(200);
  const BODY = '<html><head><script>self.__next_f=[]</script></head><body><p>hello</p></body></html>';
  const raw = (url: string, headers: Record<string, string>) => new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }>((resolve, reject) => {
    http.get(url, { headers }, (res) => { const chunks: Buffer[] = []; res.on("data", (c) => chunks.push(c)); res.on("end", () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) })); }).on("error", reject);
  });
  // /_next/ answers like Next (compressing when asked), /ar is a public page the proxy marked, anything else a private page.
  const app: http.RequestListener = (req, res) => {
    if ((req.url || "").startsWith("/_next/")) {
      const gz = /gzip/.test(String(req.headers["accept-encoding"] || ""));
      res.writeHead(200, { "content-type": "application/javascript", ...(gz ? { "content-encoding": "gzip" } : {}) });
      res.end(gz ? zlib.gzipSync(ASSET) : ASSET);
      return;
    }
    html(res, 200, BODY, req.url === "/ar" ? {} : { [CSP_INJECT_HEADER]: "" });
  };
  const privatePage: http.RequestListener = (_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-security-policy": PLACEHOLDER_POLICY });
    res.end(BODY);
  };

  it("picks br, then gzip, else none", () => {
    expect(pickEncoding("gzip, deflate, br")).toBe("br");
    expect(pickEncoding("gzip")).toBe("gzip");
    expect(pickEncoding("identity")).toBeNull();
    expect(pickEncoding(undefined)).toBeNull();
  });

  it("assets keep the app's compression (Accept-Encoding forwarded, body passed through)", async () => {
    const { base, seen } = await start(app);
    const r = await raw(`${base}/_next/static/chunks/a.js`, { "accept-encoding": "gzip" });
    expect(r.headers["content-encoding"]).toBe("gzip");
    expect(zlib.gunzipSync(r.body).toString()).toBe(ASSET);
    expect(seen.at(-1)?.headers["accept-encoding"]).toBe("gzip");
  });

  it("a stamped public document goes out compressed, with the fresh nonce inside", async () => {
    const { base, seen } = await start(app);
    const r = await raw(`${base}/ar`, { accept: "text/html", "accept-encoding": "br, gzip" });
    expect(seen.at(-1)?.headers["accept-encoding"]).toBeUndefined(); // the app answers documents uncompressed
    expect(r.headers["content-encoding"]).toBe("br");
    expect(r.headers.vary).toContain("Accept-Encoding");
    expect(r.headers["content-length"]).toBeUndefined();
    const text = zlib.brotliDecompressSync(r.body).toString();
    const nonce = /'nonce-([^']+)'/.exec(String(r.headers["content-security-policy"]))?.[1];
    expect(nonce).toBeTruthy();
    expect(nonce).not.toBe(CSP_NONCE_PLACEHOLDER);
    expect(text).toContain(`<script nonce="${nonce}">`);
  });

  it("gzips a big stamped page for a client that accepts only gzip, and the stamp survives the round trip", async () => {
    const big = `<html><head><script>self.__next_f=[]</script></head><body>${"<p>public page</p>".repeat(2000)}</body></html>`;
    const { base } = await start((_req, res) => html(res, 200, big, { "cache-control": "s-maxage=60" }));
    const r = await raw(`${base}/ar`, { "accept-encoding": "gzip", accept: "text/html" });
    expect(r.headers["content-encoding"]).toBe("gzip");
    const text = zlib.gunzipSync(r.body).toString("utf8");
    expect(text).toMatch(/<script nonce="[^"]+">self\.__next_f=\[\]<\/script>/);
    expect(r.body.length).toBeLessThan(text.length / 5);
  });

  it("a private document is compressed too and left unchanged", async () => {
    const { base } = await start(privatePage);
    const r = await raw(`${base}/ar/dashboard`, { accept: "text/html", "accept-encoding": "gzip" });
    expect(r.headers["content-encoding"]).toBe("gzip");
    expect(zlib.gunzipSync(r.body).toString()).toBe(BODY);
  });

  it("a client that accepts no compression gets plain HTML", async () => {
    const { base } = await start(privatePage);
    const r = await raw(`${base}/ar/dashboard`, { accept: "text/html", "accept-encoding": "identity" });
    expect(r.headers["content-encoding"]).toBeUndefined();
    expect(r.body.toString()).toBe(BODY);
  });

  it("the unavailable page (503) is compressed like any document, and a trusted edge gets a compressed unstamped page", async () => {
    const failing: http.RequestListener = (req, res) => {
      if (req.headers[UNAVAILABLE_FALLBACK_HEADER] === "1") return html(res, 200, FALLBACK_PAGE, { "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate" });
      res.writeHead(500, { "content-type": "text/plain", [CSP_INJECT_HEADER]: "1" });
      res.end("Internal Server Error");
    };
    const a = await start(failing);
    const r = await raw(`${a.base}/ar/c`, { accept: "text/html", "accept-encoding": "gzip" });
    expect(r.status).toBe(503);
    expect(r.headers["content-encoding"]).toBe("gzip");
    expect(zlib.gunzipSync(r.body).toString()).toContain("unavailable");

    const b = await start((_req, res) => html(res, 200, PAGE, { "cache-control": "s-maxage=60" }), { edgeToken: "s3cret" });
    const e = await raw(`${b.base}/ar`, { accept: "text/html", "accept-encoding": "gzip", [EDGE_STAMP_HEADER]: "s3cret" });
    expect(e.headers["content-encoding"]).toBe("gzip");
    expect(zlib.gunzipSync(e.body).toString()).toBe(PAGE);
    expect(e.headers["content-security-policy"]).toContain(`'nonce-${CSP_NONCE_PLACEHOLDER}'`);
  });

  it("a request that sends Accept: */* (a crawler, a script) for a marked page gets a page this server could stamp, never Next's compressed bytes", async () => {
    // Next compresses a response when the request asks for it; stamping those bytes as text would corrupt the page.
    const seenAcceptEncoding: Array<string | undefined> = [];
    const { base } = await start((req, res) => {
      seenAcceptEncoding.push(req.headers["accept-encoding"] as string | undefined);
      const gz = /gzip/.test(String(req.headers["accept-encoding"] || ""));
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-security-policy": PLACEHOLDER_POLICY, [CSP_INJECT_HEADER]: "1", ...(gz ? { "content-encoding": "gzip" } : {}) });
      res.end(gz ? zlib.gzipSync(BODY) : BODY);
    });
    const r = await raw(`${base}/ar`, { accept: "*/*", "accept-encoding": "gzip" });
    expect(seenAcceptEncoding).toEqual([undefined]);
    const text = zlib.gunzipSync(r.body).toString();
    expect(text).toContain(`<script nonce="${/'nonce-([^']+)'/.exec(String(r.headers["content-security-policy"]))?.[1]}">`);
  });

  it("an RSC or JSON request keeps its Accept-Encoding", async () => {
    const { base, seen } = await start((_req, res) => { res.writeHead(200, { "content-type": "text/x-component" }); res.end("1:x"); });
    await raw(`${base}/ar/c`, { accept: "text/x-component", rsc: "1", "accept-encoding": "gzip" });
    await raw(`${base}/ar/c`, { accept: "application/json", "accept-encoding": "gzip" });
    expect(seen.map((s) => s.headers["accept-encoding"])).toEqual(["gzip", "gzip"]);
  });

  it("leaves non-text answers alone", async () => {
    const { base } = await start((_req, res) => { res.writeHead(200, { "content-type": "image/png" }); res.end(Buffer.alloc(3000, 1)); });
    const r = await raw(`${base}/ar/photo`, { "accept-encoding": "gzip" });
    expect(r.headers["content-encoding"]).toBeUndefined();
    expect(r.body).toHaveLength(3000);
  });
});
