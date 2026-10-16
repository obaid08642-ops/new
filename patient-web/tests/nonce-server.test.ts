// F82-3: the nonce server in front of the static/ISR public pages (server/nonce-server.mjs), and its compression (F68
// follow-up, #293 review: assets keep their own compression, the documents it rewrites are compressed here).
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handler, pickEncoding, precompressedAsset, EDGE_STAMP_HEADER } from "../server/nonce-server.mjs";
import { CSP_INJECT_HEADER, CSP_NONCE_PLACEHOLDER, contentSecurityPolicy } from "../lib/security/csp";
import { UNAVAILABLE_FALLBACK_HEADER } from "../lib/security/query-twin";

const PLACEHOLDER_POLICY = contentSecurityPolicy(CSP_NONCE_PLACEHOLDER, false);
const PAGE = '<html><head><script>self.__next_f=[]</script></head><body><p>page</p></body></html>';
const FALLBACK_PAGE = '<html><head><script>self.__next_f=[]</script></head><body><p>unavailable</p></body></html>';

type Seen = { url?: string; headers: http.IncomingHttpHeaders }[];

const closers: Array<() => void> = [];
afterEach(() => { while (closers.length) closers.pop()!(); });

async function start(upstream: http.RequestListener, options: { edgeToken?: string; staticDir?: string | null } = {}) {
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
    // Restored from main (owner decision 2026-10-16: never a shared nonce). A cacheable public page that is stamped with a
    // nonce (here: a visitor with a theme cookie, whose copy is theirs) is private; the guest copy that IS shared carries no
    // nonce at all (next test).
    const { base } = await start((_req, res) => html(res, 200, PAGE, { "cache-control": "s-maxage=60, stale-while-revalidate=31535940" }));
    const r = await fetch(`${base}/ar`, { headers: { cookie: "nabd.theme=dark" } });
    expect(nonceOf(r)).toBeTruthy();
    expect(r.headers.get("cache-control")).toBe("private, no-cache");
    expect(r.headers.get("cache-control")).not.toContain("s-maxage");
  });

  it("no response that carries a nonce is ever shareable, and no nonce is ever reused (guest, theme cookie, session, HEAD)", async () => {
    const { base } = await start((_req, res) => html(res, 200, PAGE, { "cache-control": "s-maxage=60, stale-while-revalidate=31535940" }));
    const seen = new Set<string>();
    for (const init of [{}, { headers: { cookie: "nabd.theme=light" } }, { headers: { cookie: "nabd.theme=dark" } }, { method: "HEAD" }, {}, { method: "HEAD" }] as RequestInit[]) {
      const r = await fetch(`${base}/ar`, init);
      const body = init.method === "HEAD" ? "" : await r.text();
      const cc = r.headers.get("cache-control") || "";
      const nonce = nonceOf(r);
      if (nonce) {
        expect(cc).toMatch(/private/);
        expect(cc).not.toMatch(/public|s-maxage/);
        expect(seen.has(nonce)).toBe(false);
        seen.add(nonce);
      } else {
        expect(body).not.toMatch(/nonce=/i);
        expect(body).not.toContain(CSP_NONCE_PLACEHOLDER);
      }
    }
    expect(seen.size).toBe(4);
  });

  it("owner decision 2026-10-16: a guest's cached public page has a hash policy with 'strict-dynamic', no nonce, and every inline script matches a hash", async () => {
    const page = '<html><head><link rel="preload" as="script" fetchPriority="low" nonce="' + CSP_NONCE_PLACEHOLDER + '" href="/_next/static/chunks/a.js"/>'
      + '<script type="application/ld+json">{"@type":"Thing"}</script></head><body><p>page</p>'
      + '<script src="/_next/static/chunks/a.js" id="_R_" async=""></script><script src="/_next/static/chunks/p.js" noModule=""></script>'
      + '<script nonce="' + CSP_NONCE_PLACEHOLDER + '">(self.__next_f=self.__next_f||[]).push([0])</script>'
      + '<script>self.__next_f.push([1,"0:{\\"nonce\\":\\"' + CSP_NONCE_PLACEHOLDER + '\\"}"])</script></body></html>';
    const { base } = await start((_req, res) => html(res, 200, page, { "cache-control": "s-maxage=60, stale-while-revalidate=31535940", "set-cookie": "NEXT_LOCALE=ar; Path=/" }));
    const r = await fetch(`${base}/ar`, { headers: { accept: "text/html" } });
    const body = await r.text();
    const policy = r.headers.get("content-security-policy") || "";
    const scriptSrc = policy.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src ")) || "";
    expect(r.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=60, stale-while-revalidate=31535940, stale-if-error=31536000");
    expect(r.headers.get("set-cookie")).toBeNull();
    expect(policy).not.toMatch(/'nonce-/);
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(body).not.toMatch(/nonce=/i);
    expect(body).not.toContain(CSP_NONCE_PLACEHOLDER);
    // no parser-inserted external script and no script preload is left (both would need a nonce under 'strict-dynamic')
    expect(body).not.toMatch(/<script[^>]*\ssrc=/i);
    expect(body).not.toMatch(/<link[^>]*as="script"/i);
    const inline = [...body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
    expect(inline.length).toBe(4);
    for (const text of inline) expect(scriptSrc).toContain(`'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`);
    // the loader inserts the same external scripts, attributes and order kept
    expect(body).toContain('"src":"/_next/static/chunks/a.js","id":"_R_","async":""');
    expect(body).toContain('"src":"/_next/static/chunks/p.js","nomodule":""');
    // the same copy is the same bytes and the same policy every time (what the edge keeps is self-consistent; nothing per response)
    const again = await fetch(`${base}/ar`, { headers: { accept: "text/html" } });
    expect(await again.text()).toBe(body);
    expect(again.headers.get("content-security-policy")).toBe(policy);
  });

  it("issue 1548: a HEAD, an error status or a page Next did not mark s-maxage is never shared", async () => {
    const { base } = await start((req, res) => html(res, req.url === "/ar/gone" ? 404 : 200, PAGE, { "cache-control": req.url === "/ar/dyn" ? "private, no-cache, no-store, max-age=0, must-revalidate" : "s-maxage=60, stale-while-revalidate=31535940" }));
    expect((await fetch(`${base}/ar/gone`)).headers.get("cache-control")).toBe("private, no-cache");
    expect((await fetch(`${base}/ar/dyn`)).headers.get("cache-control")).toContain("no-store");
    expect((await fetch(`${base}/ar`, { method: "HEAD" })).headers.get("cache-control")).toBe("private, no-cache");
  });
});

describe("the visitor's theme on <html> (owner decision 43 a, issue 427)", () => {
  const privateDoc: http.RequestListener = (_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate" });
    res.end('<!DOCTYPE html><html lang="ar" dir="rtl"><head></head><body><p>dashboard</p></body></html>');
  };

  it("a public page carries the theme from the cookie: both hooks and the colour scheme", async () => {
    const { base } = await start((_req, res) => html(res, 200, PAGE, { "cache-control": "s-maxage=60, stale-while-revalidate=31535940" }));
    const r = await fetch(`${base}/ar`, { headers: { cookie: "other=1; nabd.theme=dark", accept: "text/html" } });
    const body = await r.text();
    expect(body).toContain('<html data-theme="dark" class="dark" style="color-scheme:dark">');
    expect(r.headers.get("cache-control")).toBe("private, no-cache");
  });

  it("a private page carries it too, light without the dark class; with no cookie the page is unchanged", async () => {
    const { base } = await start(privateDoc);
    const lit = await (await fetch(`${base}/ar/dashboard`, { headers: { cookie: "nabd.theme=light", accept: "text/html" } })).text();
    expect(lit).toContain('<html data-theme="light" style="color-scheme:light" lang="ar" dir="rtl">');
    const plain = await (await fetch(`${base}/ar/dashboard`, { headers: { accept: "text/html" } })).text();
    expect(plain).toContain('<html lang="ar" dir="rtl">');
  });

  it("ignores a value that is not a theme, and never themes an answer a shared cache may keep", async () => {
    const { base } = await start(privateDoc);
    const odd = await (await fetch(`${base}/ar/dashboard`, { headers: { cookie: 'nabd.theme=dark" onload="x', accept: "text/html" } })).text();
    expect(odd).not.toContain("data-theme");
    const shared = await start((_req, res) => {
      res.writeHead(200, { "content-type": "text/html", "cache-control": "public, max-age=60" });
      res.end("<html><body>x</body></html>");
    });
    const kept = await (await fetch(`${shared.base}/ar/about`, { headers: { cookie: "nabd.theme=dark", accept: "text/html" } })).text();
    expect(kept).toBe("<html><body>x</body></html>");
  });

  it("a trusted edge gets the page without a theme (the copy it keeps is everyone's)", async () => {
    const { base } = await start((_req, res) => html(res, 200, PAGE, { "cache-control": "s-maxage=60, stale-while-revalidate=31535940" }), { edgeToken: "edge-secret" });
    const body = await (await fetch(`${base}/ar`, { headers: { cookie: "nabd.theme=dark", [EDGE_STAMP_HEADER]: "edge-secret" } })).text();
    expect(body).not.toContain("data-theme");
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

  it("anyone else is stamped here and gets `private, no-cache` while an edge worker is configured: a wrong token or no token", async () => {
    for (const [options, header] of [[{ edgeToken: "s3cret" }, "wrong"], [{ edgeToken: "s3cret" }, undefined]] as const) {
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
    // a visitor with a theme cookie gets a stamped (private) copy; the guest's shared copy is hashed (next test)
    const r = await raw(`${base}/ar`, { "accept-encoding": "gzip", accept: "text/html", cookie: "nabd.theme=light" });
    expect(r.headers["content-encoding"]).toBe("gzip");
    const text = zlib.gunzipSync(r.body).toString("utf8");
    expect(text).toMatch(/<script nonce="[^"]+">self\.__next_f=\[\]<\/script>/);
    expect(r.body.length).toBeLessThan(text.length / 5);
  });

  it("gzips a guest's shared (hashed) copy too, and the hash of its inline script is in the policy", async () => {
    const big = `<html><head><script>self.__next_f=[]</script></head><body>${"<p>public page</p>".repeat(2000)}</body></html>`;
    const { base } = await start((_req, res) => html(res, 200, big, { "cache-control": "s-maxage=60" }));
    const r = await raw(`${base}/ar`, { "accept-encoding": "gzip", accept: "text/html" });
    expect(r.headers["content-encoding"]).toBe("gzip");
    const text = zlib.gunzipSync(r.body).toString("utf8");
    expect(text).toContain("<script>self.__next_f=[]</script>");
    expect(String(r.headers["content-security-policy"])).toContain(`'sha256-${createHash("sha256").update("self.__next_f=[]").digest("base64")}'`);
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

// F82 (issue 426): scripts and stylesheets the build compressed with brotli (scripts/precompress-static.mjs) go to a client that
// accepts br from the .br file; Next still answers the head.
describe("precompressed build assets", () => {
  const SCRIPT = "console.log('a precompressed chunk');".repeat(300);
  const raw = (url: string, headers: Record<string, string>, method = "GET") => new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }>((resolve, reject) => {
    http.request(url, { headers, method }, (res) => { const chunks: Buffer[] = []; res.on("data", (c) => chunks.push(c)); res.on("end", () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) })); }).on("error", reject).end();
  });
  let dir = "";
  const app: http.RequestListener = (req, res) => {
    if (req.url === "/_next/static/chunks/missing.js") { res.writeHead(404, { "content-type": "text/plain" }); res.end("nope"); return; }
    if (req.headers["if-none-match"] === 'W/"10-abc"') { res.writeHead(304, { etag: 'W/"10-abc"' }); res.end(); return; }
    const gz = /gzip/.test(String(req.headers["accept-encoding"] || ""));
    res.writeHead(200, { "content-type": "application/javascript; charset=UTF-8", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff", etag: 'W/"10-abc"', ...(gz ? { "content-encoding": "gzip" } : {}) });
    res.end(req.method === "HEAD" ? undefined : gz ? zlib.gzipSync(SCRIPT) : SCRIPT);
  };
  const setup = () => {
    dir = mkdtempSync(join(tmpdir(), "nabd-static-"));
    mkdirSync(join(dir, "chunks"));
    writeFileSync(join(dir, "chunks", "a.js.br"), zlib.brotliCompressSync(SCRIPT));
    writeFileSync(join(dir, "chunks", "missing.js.br"), zlib.brotliCompressSync(SCRIPT));
    closers.push(() => rmSync(dir, { recursive: true, force: true }));
    return dir;
  };

  it("sends the .br file with Next's head (type, cache, security headers), its length and its own validator", async () => {
    const { base, seen } = await start(app, { staticDir: setup() });
    const r = await raw(`${base}/_next/static/chunks/a.js`, { "accept-encoding": "gzip, deflate, br" });
    expect(r.status).toBe(200);
    expect(r.headers["content-encoding"]).toBe("br");
    expect(zlib.brotliDecompressSync(r.body).toString()).toBe(SCRIPT);
    expect(r.headers["content-length"]).toBe(String(r.body.length));
    expect(r.headers["content-type"]).toBe("application/javascript; charset=UTF-8");
    expect(r.headers["cache-control"]).toContain("immutable");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers.vary).toContain("Accept-Encoding");
    expect(r.headers.etag).toBe('W/"10-abc-br"');
    expect(seen.at(-1)?.headers["accept-encoding"]).toBe("identity");
  });

  it("a HEAD gets the head only", async () => {
    const { base } = await start(app, { staticDir: setup() });
    const r = await raw(`${base}/_next/static/chunks/a.js`, { "accept-encoding": "br" }, "HEAD");
    expect(r.status).toBe(200);
    expect(r.headers["content-encoding"]).toBe("br");
    expect(r.body).toHaveLength(0);
  });

  it("a client without br, an asset without a .br file, or Next not answering 200 goes through as before", async () => {
    const { base, seen } = await start(app, { staticDir: setup() });
    const gzip = await raw(`${base}/_next/static/chunks/a.js`, { "accept-encoding": "gzip" });
    expect(gzip.headers["content-encoding"]).toBe("gzip");
    expect(zlib.gunzipSync(gzip.body).toString()).toBe(SCRIPT);
    const other = await raw(`${base}/_next/static/chunks/b.js`, { "accept-encoding": "br, gzip" });
    expect(other.headers["content-encoding"]).toBe("gzip");
    const missing = await raw(`${base}/_next/static/chunks/missing.js`, { "accept-encoding": "br, gzip" });
    expect(missing.status).toBe(404);
    expect(missing.body.toString()).toBe("nope");
    expect(seen.filter((s) => s.url === "/_next/static/chunks/missing.js")).toHaveLength(2);
  });

  it("passes a 304 through", async () => {
    const { base } = await start(app, { staticDir: setup() });
    const r = await raw(`${base}/_next/static/chunks/a.js`, { "accept-encoding": "br", "if-none-match": 'W/"10-abc"' });
    expect(r.status).toBe(304);
    expect(r.body).toHaveLength(0);
  });

  it("never reads outside the static folder, and only scripts and stylesheets", () => {
    const root = setup();
    writeFileSync(join(root, "secret.txt.br"), "x");
    expect(precompressedAsset(root, "/_next/static/chunks/a.js")?.file).toBe(join(root, "chunks", "a.js.br"));
    expect(precompressedAsset(root, "/_next/static/chunks/a.js?dpl=1")?.file).toBe(join(root, "chunks", "a.js.br"));
    expect(precompressedAsset(root, "/_next/static/../../etc/passwd.js")).toBeNull();
    expect(precompressedAsset(root, "/_next/static/%2e%2e/%2e%2e/x.js")).toBeNull();
    expect(precompressedAsset(root, "/_next/static/secret.txt")).toBeNull();
    expect(precompressedAsset(root, "/ar/chunks/a.js")).toBeNull();
    expect(precompressedAsset(null, "/_next/static/chunks/a.js")).toBeNull();
  });
});
