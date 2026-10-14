import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (...a: unknown[]) => revalidateTag(...a) }));

import { POST } from "./route";

const call = (body: unknown, auth?: string) =>
  POST(new Request("http://localhost/api/revalidate", {
    method: "POST",
    headers: { "content-type": "application/json", ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(body),
  }));

describe("POST /api/revalidate (14.8)", () => {
  beforeEach(() => { revalidateTag.mockClear(); process.env.NEXT_REVALIDATE_SECRET = "s3cret-value"; });
  afterEach(() => { delete process.env.NEXT_REVALIDATE_SECRET; });

  it("revalidates each tag once with the right secret", async () => {
    const res = await call({ tags: ["medicines", "medicines"] }, "Bearer s3cret-value");
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("medicines", { expire: 0 });
  });

  it("refuses a wrong or missing secret", async () => {
    expect((await call({ tags: ["medicines"] }, "Bearer wrong")).status).toBe(401);
    expect((await call({ tags: ["medicines"] })).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("is off when no secret is configured", async () => {
    delete process.env.NEXT_REVALIDATE_SECRET;
    expect((await call({ tags: ["medicines"] }, "Bearer ")).status).toBe(503);
  });

  it("rejects bad tag lists", async () => {
    for (const tags of [[], ["Bad Tag"], [1], Array(51).fill("a")]) {
      expect((await call({ tags }, "Bearer s3cret-value")).status).toBe(400);
    }
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
