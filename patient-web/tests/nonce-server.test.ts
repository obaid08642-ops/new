import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import zlib from "node:zlib";
import { handler, pickEncoding } from "../server/nonce-server.mjs";
import { contentSecurityPolicy, CSP_INJECT_HEADER, CSP_NONCE_PLACEHOLDER } from "../lib/security/csp";

// F68 follow-up (#293 review): the nonce server must not strip compression from assets, and must compress the
// documents it rewrites.
const PAGE = '<html><head><script>self.__next_f=[]</script></head><body><p>hello</p></body></html>';
const ASSET = "console.log('chunk');".repeat(200);
let upstream: http.Server;
let front: http.Server;
let base = "";
const seen: Array<{ url: string; acceptEncoding?: string }> = [];

beforeAll(async () => {
  upstream = http.createServer((req, res) => {
    seen.push({ url: req.url || "", acceptEncoding: req.headers["accept-encoding"] as string | undefined });
    if ((req.url || "").startsWith("/_next/")) {
      const gz = /gzip/.test(String(req.headers["accept-encoding"] || ""));
      res.writeHead(200, { "content-type": "application/javascript", ...(gz ? { "content-encoding": "gzip" } : {}) });
      res.end(gz ? zlib.gzipSync(ASSET) : ASSET);
      return;
    }
    const inject = req.url === "/ar";
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-security-policy": contentSecurityPolicy(CSP_NONCE_PLACEHOLDER, false), ...(inject ? { [CSP_INJECT_HEADER]: "1" } : {}) });
    res.end(PAGE);
  });
  await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
  front = http.createServer(handler((upstream.address() as { port: number }).port));
  await new Promise<void>((r) => front.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(front.address() as { port: number }).port}`;
});
afterAll(() => { front.close(); upstream.close(); });

function get(path: string, headers: Record<string, string>) {
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }>((resolve, reject) => {
    http.get(`${base}${path}`, { headers }, (res) => {
      const parts: Buffer[] = [];
      res.on("data", (c) => parts.push(c));
      res.on("end", () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(parts) }));
    }).on("error", reject);
  });
}

describe("nonce server compression", () => {
  it("picks br, then gzip, else none", () => {
    expect(pickEncoding("gzip, deflate, br")).toBe("br");
    expect(pickEncoding("gzip")).toBe("gzip");
    expect(pickEncoding("identity")).toBeNull();
    expect(pickEncoding(undefined)).toBeNull();
  });

  it("assets keep the app's compression (Accept-Encoding forwarded, body passed through)", async () => {
    const r = await get("/_next/static/chunks/a.js", { "accept-encoding": "gzip" });
    expect(r.headers["content-encoding"]).toBe("gzip");
    expect(zlib.gunzipSync(r.body).toString()).toBe(ASSET);
    expect(seen.at(-1)?.acceptEncoding).toBe("gzip");
  });

  it("a stamped public document goes out compressed, with the fresh nonce inside", async () => {
    const r = await get("/ar", { accept: "text/html", "accept-encoding": "br, gzip" });
    expect(seen.at(-1)?.acceptEncoding).toBeUndefined();
    expect(r.headers["content-encoding"]).toBe("br");
    const html = zlib.brotliDecompressSync(r.body).toString();
    const nonce = /'nonce-([^']+)'/.exec(String(r.headers["content-security-policy"]))?.[1];
    expect(nonce).toBeTruthy();
    expect(html).toContain(`<script nonce="${nonce}">`);
    expect(r.headers["content-length"]).toBeUndefined();
  });

  it("a private document is compressed too and left unchanged", async () => {
    const r = await get("/ar/dashboard", { accept: "text/html", "accept-encoding": "gzip" });
    expect(r.headers["content-encoding"]).toBe("gzip");
    expect(zlib.gunzipSync(r.body).toString()).toBe(PAGE);
  });

  it("a client that accepts no compression gets plain HTML", async () => {
    const r = await get("/ar/dashboard", { accept: "text/html" });
    expect(r.headers["content-encoding"]).toBeUndefined();
    expect(r.body.toString()).toBe(PAGE);
  });
});
