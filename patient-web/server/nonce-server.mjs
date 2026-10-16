// F68: production entry point for the web app (Docker CMD, CI). It starts the Next standalone server on an
// internal port and sits in front of it. HTML that the proxy marked (public page) gets a fresh nonce per response:
// in the CSP header and on every <script>/<style> tag. Every other response passes through untouched, so private
// pages keep the nonce Next stamped itself.
//
// F82-3 adds two things for the static/ISR public pages (see docs/design/audit/f82-3-static.md):
//  - When Next answers a marked page with 5xx (a static page whose data could not be read and that has no cached copy:
//    Next keeps the last good copy when it has one), the same URL is asked again with `x-nabd-unavailable: 1`; the proxy
//    then answers with the translated unavailable page, and this server sends it as 503 + Retry-After, never cached.
//  - Edge mode (off unless NABD_EDGE_STAMP_TOKEN is set): a request that carries `x-nabd-edge-stamp: <token>` comes from
//    an edge worker that stamps the nonce itself, so the page goes out with the placeholder policy, unstamped, and with
//    the cache headers Next set (s-maxage, stale-while-revalidate) plus stale-if-error, so the edge may keep it. Every
//    other request is stamped here and is `private, no-cache`.
//
// Compression (one implementation, the reviewer's: a hashed asset, an image, an RSC or JSON answer keeps the app's own
// Accept-Encoding and compression and passes through; only an HTML document, which this server may rewrite, is requested
// uncompressed and compressed here, br or gzip by the client's Accept-Encoding).
//
// F82 (issue 426): Next only gzips. A build script and script or stylesheet under /_next/static/ that the build compressed
// with brotli ahead of time (scripts/precompress-static.mjs writes `<file>.br` next to it) goes to a client that accepts br
// from that file: about 14% fewer bytes than Next's gzip on the scripts every page loads. Next still answers the head
// (a HEAD request: status, type, cache and security headers), so nothing about the asset changes but its encoding.
//
//   node server/nonce-server.mjs            (PORT = public port, default 3000; NEXT_INTERNAL_PORT default 3999+)
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { CSP_INJECT_HEADER, UNAVAILABLE_FALLBACK_HEADER, createStamper, createThemeStamper, freshNonce, policyWithNonce, themeFromCookie } from "./nonce-transform.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_PORT = Number(process.env.PORT || 3000);
const PUBLIC_HOST = process.env.HOSTNAME || "0.0.0.0";
const INTERNAL_PORT = Number(process.env.NEXT_INTERNAL_PORT || PUBLIC_PORT + 1);
const NEXT_SERVER = process.env.NEXT_STANDALONE_SERVER || path.join(HERE, "..", "server.js");

export const EDGE_STAMP_HEADER = "x-nabd-edge-stamp";
const NO_STORE = "private, no-cache, no-store, max-age=0, must-revalidate";
const UNAVAILABLE_RETRY_SECONDS = "30";

function sameSecret(given, expected) {
  if (!expected || typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** br or gzip, by the client's Accept-Encoding; null when it accepts neither. */
export function pickEncoding(acceptEncoding) {
  const accepted = String(Array.isArray(acceptEncoding) ? acceptEncoding.join(",") : acceptEncoding || "").toLowerCase();
  if (/\bbr\b/.test(accepted)) return "br";
  if (/\bgzip\b/.test(accepted)) return "gzip";
  return null;
}

function compressor(encoding) {
  if (encoding === "br") return zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
  return zlib.createGzip({ level: 6 });
}

const STATIC_PREFIX = "/_next/static/";
const precompressedCache = new Map();

/**
 * The brotli file the build wrote for a script or stylesheet under /_next/static/ ({ file, size }), or null. Hashed assets
 * never change under the same name, so what is found (or not) is remembered. Anything that would leave the static
 * folder is refused.
 */
export function precompressedAsset(staticDir, url) {
  if (!staticDir) return null;
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(String(url || ""), "http://local").pathname);
  } catch {
    return null;
  }
  if (!pathname.startsWith(STATIC_PREFIX) || !/\.(?:js|css)$/.test(pathname)) return null;
  const rel = path.posix.normalize(pathname.slice(STATIC_PREFIX.length));
  if (rel.startsWith("..") || path.posix.isAbsolute(rel) || rel.includes("\0")) return null;
  const root = path.resolve(staticDir);
  const file = path.resolve(root, `${rel}.br`);
  if (!file.startsWith(root + path.sep)) return null;
  if (precompressedCache.has(file)) return precompressedCache.get(file);
  let found = null;
  try {
    const stat = fs.statSync(file);
    if (stat.isFile()) found = { file, size: stat.size };
  } catch {
    found = null;
  }
  precompressedCache.set(file, found);
  return found;
}

const acceptsBrotli = (req) => /\bbr\b/i.test(String(req.headers["accept-encoding"] || ""));

const isHtml = (headers) => /text\/html/i.test(String(headers["content-type"] || ""));

// What is a document (a page this server may rewrite) and what is not (it passes through with the app's own Accept-Encoding and
// compression): not a build asset, a static file, an RSC request or a JSON request. A crawler or a script that sends
// `Accept: */*` asks for a page too, and must get one this server can stamp, so the test is on what it is NOT, not on `text/html`.
const NOT_A_DOCUMENT_URL = /^\/_next\/|\.(?:js|css|woff2?|png|jpe?g|webp|avif|svg|ico|gif|map|json|txt|xml)(?:\?|$)/i;
const NOT_A_DOCUMENT_ACCEPT = /application\/json|text\/x-component/i;
const isDocumentRequest = (req) => !NOT_A_DOCUMENT_URL.test(String(req.url || "")) && !req.headers.rsc && !NOT_A_DOCUMENT_ACCEPT.test(String(req.headers.accept || ""));
const wantsHtmlPage = (req) => req.method === "GET" && isDocumentRequest(req);

/**
 * Writes the response head and returns where the body goes: the response itself, or a compressor piped into it. An HTML
 * document that this server asked to receive uncompressed is compressed (unless the app encoded it anyway, or there is no
 * body); the content length is then unknown, so it is dropped. `encoding` is null for what is not a document.
 */
function openBody(req, res, status, headers, encoding) {
  const compress = Boolean(encoding) && isHtml(headers) && !headers["content-encoding"] && req.method !== "HEAD" && status !== 204 && status !== 304;
  if (!compress) {
    res.writeHead(status, headers);
    return res;
  }
  const out = { ...headers, "content-encoding": encoding, vary: !headers.vary ? "Accept-Encoding" : /accept-encoding/i.test(String(headers.vary)) ? headers.vary : `${headers.vary}, Accept-Encoding` };
  delete out["content-length"];
  res.writeHead(status, out);
  const sink = compressor(encoding);
  sink.pipe(res);
  return sink;
}

/** What an edge cache may do with a page the edge stamps itself: Next's s-maxage + stale-while-revalidate, plus stale-if-error (#302: no time cap). */
function edgeCacheControl(value) {
  const base = String(value || "").trim();
  if (!/s-maxage/i.test(base)) return NO_STORE;
  return /stale-if-error/i.test(base) ? base : `${base}, stale-if-error=31536000`;
}

function sendStamped(req, res, up, status, encoding, extra = {}) {
  const out = { ...up.headers, ...extra };
  delete out[CSP_INJECT_HEADER];
  const nonce = freshNonce();
  out["content-security-policy"] = policyWithNonce(up.headers["content-security-policy"], nonce);
  // The HTML now holds a nonce for this response only: no shared cache may keep it (the render itself is
  // cached inside Next). Browsers may still keep it for back/forward. A no-store from the proxy (a session, a twin
  // of a list page, the unavailable page) is kept.
  if (!/no-store/i.test(String(out["cache-control"] || ""))) out["cache-control"] = "private, no-cache";
  delete out["content-length"];
  delete out.etag;
  const body = openBody(req, res, status, out, encoding);
  const stamper = createStamper(nonce);
  // the page is private to this response already (above), so it may carry this visitor's theme (decision 43 a)
  const themer = createThemeStamper(themeFromCookie(req.headers.cookie));
  up.setEncoding("utf8");
  up.on("data", (chunk) => body.write(themer.push(stamper.push(chunk))));
  up.on("end", () => body.end(themer.push(stamper.end()) + themer.end()));
  up.on("error", () => res.destroy());
}

/**
 * Decision 43 a: a page Next rendered for this request (a private page) gets the visitor's theme on <html> too. Only a
 * document no shared cache may keep (no `public`, no `s-maxage`) and that Next did not compress; anything else passes as is.
 */
function themeFor(req, up) {
  const theme = themeFromCookie(req.headers.cookie);
  if (!theme || !isHtml(up.headers) || up.headers["content-encoding"]) return null;
  return /\bpublic\b|s-maxage/i.test(String(up.headers["cache-control"] || "")) ? null : theme;
}

function sendUntouched(req, res, up, status, encoding) {
  up.on("error", () => res.destroy());
  const theme = themeFor(req, up);
  if (!theme) {
    up.pipe(openBody(req, res, status, { ...up.headers }, encoding));
    return;
  }
  const out = { ...up.headers };
  delete out["content-length"];
  delete out.etag;
  const body = openBody(req, res, status, out, encoding);
  const themer = createThemeStamper(theme);
  up.setEncoding("utf8");
  up.on("data", (chunk) => body.write(themer.push(chunk)));
  up.on("end", () => body.end(themer.end()));
}

/**
 * Sends a precompressed asset: the head comes from Next (asked with HEAD, uncompressed), the body from the .br file. Calls
 * `fallback` when Next does not answer 200 or 304 (the request then goes through as usual).
 */
function sendPrecompressed(req, res, asset, ask, headers, fallback) {
  const head = ask({ method: "HEAD", url: req.url }, { ...headers, "accept-encoding": "identity" }, (up) => {
    up.resume();
    const status = up.statusCode || 502;
    if (status === 304) {
      res.writeHead(304, { ...up.headers });
      res.end();
      return;
    }
    if (status !== 200) return fallback();
    const out = { ...up.headers, "content-encoding": "br", "content-length": String(asset.size) };
    out.vary = !out.vary ? "Accept-Encoding" : /accept-encoding/i.test(String(out.vary)) ? out.vary : `${out.vary}, Accept-Encoding`;
    // another representation of the same asset: its own validator
    if (typeof out.etag === "string") out.etag = out.etag.replace(/"$/, '-br"');
    delete out["transfer-encoding"];
    res.writeHead(200, out);
    if (req.method === "HEAD") return res.end();
    const body = fs.createReadStream(asset.file);
    body.on("error", () => res.destroy());
    body.pipe(res);
  }, fallback);
  head.end();
}

export function handler(internalPort, options = {}) {
  const edgeToken = options.edgeToken ?? process.env.NABD_EDGE_STAMP_TOKEN ?? "";
  const staticDir = options.staticDir === undefined ? path.join(HERE, "..", ".next", "static") : options.staticDir;
  const ask = (req, headers, onResponse, onError) => {
    const upstream = http.request({ host: "127.0.0.1", port: internalPort, method: req.method, path: req.url, headers }, onResponse);
    upstream.on("error", onError);
    return upstream;
  };

  return (req, res) => {
    if ((req.method === "GET" || req.method === "HEAD") && acceptsBrotli(req)) {
      const asset = precompressedAsset(staticDir, req.url);
      if (asset) {
        const assetHeaders = { ...req.headers };
        delete assetHeaders[UNAVAILABLE_FALLBACK_HEADER];
        delete assetHeaders[EDGE_STAMP_HEADER];
        return sendPrecompressed(req, res, asset, ask, assetHeaders, () => proxy(req, res));
      }
    }
    return proxy(req, res);
  };

  function proxy(req, res) {
    const headers = { ...req.headers };
    // Only HTML documents may be rewritten. For those the app answers uncompressed and this server compresses its own
    // output (openBody); everything else (JS, CSS, images, RSC, API) keeps Next's compression and passes through.
    const isDocument = isDocumentRequest(req);
    if (isDocument) delete headers["accept-encoding"];
    const encoding = isDocument ? pickEncoding(req.headers["accept-encoding"]) : null;
    // Only this server may ask for the unavailable page, and only a trusted edge may ask not to be stamped.
    delete headers[UNAVAILABLE_FALLBACK_HEADER];
    const edgeStamps = sameSecret(headers[EDGE_STAMP_HEADER], edgeToken);
    delete headers[EDGE_STAMP_HEADER];

    const bad = () => {
      if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain", "cache-control": "no-store" });
      res.end("bad gateway");
    };

    const upstream = ask(req, headers, (up) => {
      const marked = up.headers[CSP_INJECT_HEADER] === "1";
      const status = up.statusCode || 502;

      // A marked page that failed and has no cached copy: the translated unavailable page, as 503, at the same URL.
      if (marked && status >= 500 && wantsHtmlPage(req)) {
        up.resume();
        const retry = ask(req, { ...headers, [UNAVAILABLE_FALLBACK_HEADER]: "1" }, (fallback) => {
          if (fallback.statusCode === 200 && fallback.headers[CSP_INJECT_HEADER] === "1" && isHtml(fallback.headers)) {
            sendStamped(req, res, fallback, 503, encoding, { "retry-after": UNAVAILABLE_RETRY_SECONDS, "cache-control": NO_STORE, "x-robots-tag": "noindex, nofollow, noarchive" });
          } else {
            fallback.resume();
            if (!res.headersSent) res.writeHead(503, { "content-type": "text/plain", "cache-control": "no-store", "retry-after": UNAVAILABLE_RETRY_SECONDS });
            res.end("service unavailable");
          }
        }, bad);
        retry.end();
        return;
      }

      const inject = marked && isHtml(up.headers);
      if (!inject) return sendUntouched(req, res, up, status, encoding);

      const sharedCacheable = !/no-store/i.test(String(up.headers["cache-control"] || ""));
      if (edgeStamps && sharedCacheable && status === 200) {
        // The edge worker replaces the placeholder in the header and in the HTML for every response it sends.
        const out = { ...up.headers, "cache-control": edgeCacheControl(up.headers["cache-control"]) };
        delete out[CSP_INJECT_HEADER];
        up.on("error", () => res.destroy());
        up.pipe(openBody(req, res, status, out, encoding));
        return;
      }
      sendStamped(req, res, up, status, encoding);
    }, bad);
    req.pipe(upstream);
  }
}

async function main() {
  process.env.NABD_CSP_EDGE_NONCE = "1";
  process.env.PORT = String(INTERNAL_PORT);
  process.env.HOSTNAME = "127.0.0.1";
  await import(NEXT_SERVER);
  http.createServer(handler(INTERNAL_PORT)).listen(PUBLIC_PORT, PUBLIC_HOST, () => {
    console.log(`nonce-server: :${PUBLIC_PORT} -> next :${INTERNAL_PORT}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
