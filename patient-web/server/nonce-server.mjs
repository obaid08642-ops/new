// F68: production entry point for the web app (Docker CMD, CI). It starts the Next standalone server on an
// internal port and sits in front of it. HTML that the proxy marked (public page, no session) gets a fresh
// nonce per response: in the CSP header and on every <script>/<style> tag. Every other response passes
// through untouched, so signed-in and private pages keep the nonce Next stamped itself.
//
//   node server/nonce-server.mjs            (PORT = public port, default 3000; NEXT_INTERNAL_PORT default 3999+)
import http from "node:http";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CSP_INJECT_HEADER, createStamper, freshNonce, policyWithNonce } from "./nonce-transform.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_PORT = Number(process.env.PORT || 3000);
const PUBLIC_HOST = process.env.HOSTNAME || "0.0.0.0";
const INTERNAL_PORT = Number(process.env.NEXT_INTERNAL_PORT || PUBLIC_PORT + 1);
const NEXT_SERVER = process.env.NEXT_STANDALONE_SERVER || path.join(HERE, "..", "server.js");

/** br or gzip, by the client's Accept-Encoding; null when it accepts neither. */
export function pickEncoding(acceptEncoding) {
  const accepted = String(acceptEncoding || "").toLowerCase();
  if (/\bbr\b/.test(accepted)) return "br";
  if (/\bgzip\b/.test(accepted)) return "gzip";
  return null;
}

function compressor(encoding) {
  if (encoding === "br") return zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
  return zlib.createGzip({ level: 6 });
}

export function handler(internalPort) {
  return (req, res) => {
    const headers = { ...req.headers };
    // Only HTML documents may be rewritten. For those the app answers uncompressed and this server compresses
    // its own output; everything else (JS, CSS, images, RSC, API) keeps Next's compression and passes through.
    const isDocument = !String(req.url || "").startsWith("/_next/") && /text\/html/i.test(String(req.headers.accept || ""));
    if (isDocument) delete headers["accept-encoding"];
    const encoding = isDocument ? pickEncoding(req.headers["accept-encoding"]) : null;
    const upstream = http.request({ host: "127.0.0.1", port: internalPort, method: req.method, path: req.url, headers }, (up) => {
      const html = /text\/html/i.test(String(up.headers["content-type"] || ""));
      const inject = up.headers[CSP_INJECT_HEADER] === "1" && html;
      const out = { ...up.headers };
      delete out[CSP_INJECT_HEADER];
      // Compress what this server asked to receive uncompressed (a document), unless the app encoded it anyway.
      const compress = isDocument && encoding && html && !up.headers["content-encoding"] && req.method !== "HEAD";
      if (compress) {
        out["content-encoding"] = encoding;
        out.vary = out.vary ? `${out.vary}, Accept-Encoding` : "Accept-Encoding";
        delete out["content-length"];
      }
      if (!inject) {
        res.writeHead(up.statusCode || 502, out);
        if (compress) up.pipe(compressor(encoding)).pipe(res);
        else up.pipe(res);
        return;
      }
      const nonce = freshNonce();
      out["content-security-policy"] = policyWithNonce(up.headers["content-security-policy"], nonce);
      // The HTML now holds a nonce for this response only: no shared cache may keep it (the render itself is
      // cached inside Next). Browsers may still keep it for back/forward.
      out["cache-control"] = "private, no-cache";
      delete out["content-length"];
      delete out.etag;
      res.writeHead(up.statusCode || 200, out);
      const sink = compress ? compressor(encoding) : null;
      if (sink) sink.pipe(res);
      const target = sink || res;
      const stamper = createStamper(nonce);
      up.setEncoding("utf8");
      up.on("data", (chunk) => target.write(stamper.push(chunk)));
      up.on("end", () => target.end(stamper.end()));
      up.on("error", () => res.destroy());
    });
    upstream.on("error", () => {
      if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain", "cache-control": "no-store" });
      res.end("bad gateway");
    });
    req.pipe(upstream);
  };
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
