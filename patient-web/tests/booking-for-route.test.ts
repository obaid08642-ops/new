import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ api: vi.fn(), token: { value: "t" as string | undefined } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (mocks.token.value ? { value: mocks.token.value } : undefined) }) }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: mocks.api }));

import { DELETE, POST } from "@/app/api/family/booking-for/route";
import { POST as book } from "@/app/api/appointments/book/route";

const ref = "a".repeat(32);
const post = (body: unknown) => POST(new Request("http://x/api/family/booking-for", { method: "POST", body: JSON.stringify(body) }));
beforeEach(() => { mocks.api.mockReset(); mocks.token.value = "t"; });

describe("booking for a family member", () => {
  it("remembers the opaque member reference in an httpOnly cookie and clears it", async () => {
    const res = await post({ ref });
    expect(res.headers.get("set-cookie")).toMatch(/nabd_booking_for=a{32}.*HttpOnly/i);
    expect((await DELETE()).headers.get("set-cookie")).toMatch(/nabd_booking_for=;/);
  });
  it("refuses a raw account id, a bad body and no session", async () => {
    expect((await post({ ref: "user-123" })).status).toBe(400);
    mocks.token.value = undefined;
    expect((await post({ ref })).status).toBe(401);
  });
  it("sends for_member_id, the insurer id and the insurance member id on to the booking", async () => {
    mocks.api.mockResolvedValue(new Response(JSON.stringify({ id: "11111111-1111-4111-8111-111111111111", status: "pending" })));
    const body = { doctor_id: "22222222-2222-4222-8222-222222222222", service_type: "clinic", slot_start: "2026-11-01T10:00:00+03:00", payment_method: "insurance", for_member_id: "member-1", insurance_provider: "company-9", insurance_member_id: "P-1" };
    const res = await book(new Request("http://x", { method: "POST", headers: { "idempotency-key": "k".repeat(20) }, body: JSON.stringify(body) }));
    expect(res.status).toBeLessThan(300);
    expect(JSON.parse(mocks.api.mock.calls[0][1].body)).toMatchObject({ for_member_id: "member-1", insurance_provider: "company-9", insurance_member_id: "P-1" });
  });
  it("passes the slot length on (the strict schema refused every web booking that carried it)", async () => {
    mocks.api.mockResolvedValue(new Response(JSON.stringify({ id: "11111111-1111-4111-8111-111111111111", status: "pending" })));
    const body = { doctor_id: "22222222-2222-4222-8222-222222222222", service_type: "video", slot_start: "2026-11-01T10:00:00+03:00", payment_method: "cash", duration_minutes: 30 };
    const res = await book(new Request("http://x", { method: "POST", headers: { "idempotency-key": "k".repeat(20) }, body: JSON.stringify(body) }));
    expect(res.status).toBeLessThan(300);
    expect(JSON.parse(mocks.api.mock.calls[0][1].body)).toMatchObject({ duration_minutes: 30 });
    const bad = await book(new Request("http://x", { method: "POST", headers: { "idempotency-key": "k".repeat(20) }, body: JSON.stringify({ ...body, duration_minutes: 5 }) }));
    expect(bad.status).toBe(400);
  });
});
