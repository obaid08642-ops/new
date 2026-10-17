// Issue 1548: the nonce server renders the most-visited product pages into the ISR cache at start (server/warm-public.mjs).
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { warmPaths, warmPublicPages, warmSettings } from "../server/warm-public.mjs";

const closers: Array<() => void> = [];
afterEach(() => { while (closers.length) closers.pop()!(); });

describe("warming the public pages", () => {
  it("is off unless a positive count and an API base are set, caps the count and drops unknown locales", () => {
    expect(warmSettings({})).toBeNull();
    expect(warmSettings({ NABD_WARM_TOP_PRODUCTS: "0", NABD_API_BASE_URL: "http://api" })).toBeNull();
    expect(warmSettings({ NABD_WARM_TOP_PRODUCTS: "50" })).toBeNull();
    expect(warmSettings({ NABD_WARM_TOP_PRODUCTS: "5000", NABD_WARM_LOCALES: "ar, xx,en", NABD_API_BASE_URL: "http://api/v1/" })).toEqual({ top: 1000, locales: ["ar", "en"], api: "http://api/v1" });
  });

  it("asks for the home, the catalogue and each product page, slugs encoded", () => {
    expect(warmPaths("ar", ["بنادول", "", null, "a b"])).toEqual(["/ar", "/ar/c", `/ar/p/${encodeURIComponent("بنادول")}`, "/ar/p/a%20b"]);
  });

  it("requests every page from the internal server and counts the answers", async () => {
    const seen: string[] = [];
    const next = http.createServer((req, res) => { seen.push(String(req.url)); res.writeHead(req.url?.endsWith("gone") ? 404 : 200); res.end("x"); });
    await new Promise<void>((resolve) => next.listen(0, "127.0.0.1", resolve));
    closers.push(() => next.close());
    const asked: string[] = [];
    const result = await warmPublicPages((next.address() as AddressInfo).port, { top: 3, locales: ["en"], api: "http://api" }, async (url) => { asked.push(url); return { items: [{ slug: "one" }, { slug: "gone" }] }; });
    expect(asked).toEqual(["http://api/public/products/search?locale=en&limit=3"]);
    expect(seen.sort()).toEqual(["/en", "/en/c", "/en/p/gone", "/en/p/one"]);
    expect(result).toEqual({ ok: 3, failed: 1 });
  });
});
