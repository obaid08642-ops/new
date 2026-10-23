import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ api: vi.fn(), token: { value: "server-only-token" as string | undefined } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (mocks.token.value ? { value: mocks.token.value } : undefined) }) }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: mocks.api }));

import { POST } from "@/app/api/insurance/ocr-extract/route";

const image = "A".repeat(200);
const post = (body: unknown) => POST(new Request("http://x/api/insurance/ocr-extract", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => { mocks.api.mockReset(); mocks.token.value = "server-only-token"; });

describe("POST /api/insurance/ocr-extract (scan the insurance card)", () => {
  it("passes the photo on as the app does and returns only the fields the form fills", async () => {
    mocks.api.mockResolvedValue(new Response(JSON.stringify({ success: true, extracted_data: { policy_number: "P-1", member_name: " Test ", secret: "x", expiry_date: "2027-01-01" } })));
    const res = await post({ image_base64: image, mime_type: "image/jpeg" });
    expect(mocks.api).toHaveBeenCalledWith("/insurance/ocr-extract", { method: "POST", body: JSON.stringify({ image_base64: image, mime_type: "image/jpeg" }) }, "server-only-token");
    expect(await res.json()).toEqual({ success: true, extracted_data: { policy_number: "P-1", member_name: "Test", expiry_date: "2027-01-01" } });
  });
  it("refuses a bad body or no session, and reports an empty read as not successful", async () => {
    expect((await post({ image_base64: "not base64!", mime_type: "image/jpeg" })).status).toBe(400);
    expect((await post({ image_base64: image, mime_type: "application/pdf" })).status).toBe(400);
    mocks.token.value = undefined;
    expect((await post({ image_base64: image, mime_type: "image/png" })).status).toBe(401);
    mocks.token.value = "t";
    mocks.api.mockResolvedValue(new Response(JSON.stringify({ success: true, extracted_data: {} })));
    expect(await (await post({ image_base64: image, mime_type: "image/png" })).json()).toEqual({ success: false, extracted_data: {} });
  });
});
