import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Handler = require("../cache-handler.cjs");

describe("P14.10 Redis cache handler", () => {
  it("encodes Next's cache values with their Buffers and Maps", () => {
    const value = { kind: "APP_PAGE", html: "<p>x</p>", rscData: Buffer.from("rsc-bytes"), segmentData: new Map([["/_index", Buffer.from("seg")]]), headers: { "x-next-cache-tags": "medicines" }, status: 200 };
    const back = Handler.decode(Handler.encode({ value, lastModified: 1, tags: ["medicines"] }));
    expect(Buffer.isBuffer(back.value.rscData)).toBe(true);
    expect(back.value.rscData.toString()).toBe("rsc-bytes");
    expect(back.value.segmentData).toBeInstanceOf(Map);
    expect(back.value.segmentData.get("/_index").toString()).toBe("seg");
    expect(back.value.html).toBe("<p>x</p>");
    expect(back.tags).toEqual(["medicines"]);
  });

  it("stores entries compressed (#1603): a page entry is about 5x smaller in Redis, and reads back identical", () => {
    const html = "<div>" + "جملة تجريبية عن الدواء ".repeat(3000) + "</div>";
    const entry = { value: { kind: "APP_PAGE", html, rscData: Buffer.from(html), headers: { "x-next-cache-tags": "medicines" }, status: 200 }, lastModified: 5, tags: ["medicines"] };
    const packed = Handler.pack(entry);
    expect(packed.length).toBeLessThan(Handler.encode(entry).length / 4);
    const back = Handler.unpack(packed);
    expect(back.value.html).toBe(html);
    expect(back.value.rscData.toString()).toBe(html);
    expect(back.lastModified).toBe(5);
  });

  it("still reads an uncompressed entry (written before compression)", () => {
    const entry = { value: { kind: "APP_PAGE", html: "x" }, lastModified: 1, tags: [] };
    expect(Handler.unpack(Buffer.from(Handler.encode(entry))).value.html).toBe("x");
  });

  it("without Redis it still serves from a local cache and drops entries by tag", async () => {
    delete process.env.NEXT_CACHE_REDIS_URL;
    const h = new Handler({ serverDistDir: "/nonexistent/server" });
    await h.set("/ar/p/a", { kind: "APP_PAGE", html: "a" }, { tags: ["medicines"] });
    await h.set("/ar", { kind: "APP_PAGE", html: "home" }, { tags: ["home"] });
    expect((await h.get("/ar/p/a")).value.html).toBe("a");
    await h.revalidateTag(["medicines"]);
    expect(await h.get("/ar/p/a")).toBeNull();
    expect((await h.get("/ar")).value.html).toBe("home");
  });
});
