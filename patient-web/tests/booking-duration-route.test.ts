// PS-P0-2: the booking form sends duration_minutes; the web route used to refuse it (400 invalid_appointment_payload)
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "t" }) }) }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: mocks.api }));

import { POST as book } from "@/app/api/appointments/book/route";

const base = { doctor_id: "22222222-2222-4222-8222-222222222222", service_type: "video", slot_start: "2026-11-01T10:00:00+03:00", payment_method: "cash" };
const send = (extra: Record<string, unknown>) => book(new Request("http://x", { method: "POST", headers: { "idempotency-key": "k".repeat(20) }, body: JSON.stringify({ ...base, ...extra }) }));
beforeEach(() => { mocks.api.mockReset(); mocks.api.mockResolvedValue(new Response(JSON.stringify({ id: "11111111-1111-4111-8111-111111111111", status: "pending" }))); });

describe("booking with a visit duration", () => {
  it("passes duration_minutes on to the backend", async () => {
    expect((await send({ duration_minutes: 45 })).status).toBeLessThan(300);
    expect(JSON.parse(mocks.api.mock.calls[0][1].body)).toMatchObject({ duration_minutes: 45 });
  });
  it("still refuses a duration outside the backend bounds (10-120) and unknown fields", async () => {
    expect((await send({ duration_minutes: 5 })).status).toBe(400);
    expect((await send({ duration_minutes: 500 })).status).toBe(400);
    expect((await send({ surprise: 1 })).status).toBe(400);
  });
});
