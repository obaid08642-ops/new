// WP-K: the website could not book a nurse. The BFF dropped the chosen nurse
// (provider_id) and defaulted to cash, which home visits refuse; the nurse page
// read services in a shape the API never sends and invented a rating, years of
// experience, a specialty and a bio; and no page linked to a nurse at all.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), createPatientPaymentIntent: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi, patientApiUrl: (p: string) => `https://api.test${p}` }));
vi.mock("@/lib/api/payments-server", () => ({ createPatientPaymentIntent: state.createPatientPaymentIntent }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));

import { POST as book } from "@/app/api/nursing/bookings/route";
import { POST as payIntent } from "@/app/api/nursing/bookings/[bookingId]/payment-intent/route";
import { extractNurse } from "@/lib/api/nursing-server";

const root = path.resolve(import.meta.dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
const future = new Date(Date.now() + 86_400_000).toISOString();
const req = (body: unknown) => new Request("https://web.test/api/nursing/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("website nurse booking (WP-K)", () => {
  beforeEach(() => {
    state.callPatientApi.mockReset();
    state.createPatientPaymentIntent.mockReset();
    state.cookieStore.get.mockImplementation((name: string) => (name === "nabd_access" ? { value: "server-access" } : undefined));
  });

  it("forwards the chosen nurse and card payment to the API", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ data: { id: "b1" } }), { status: 201 }));
    const res = await book(req({ service_id: "svc-a", provider_id: "nurse-acc", scheduled_at: future }));
    expect(res.status).toBe(200);
    const sent = JSON.parse(state.callPatientApi.mock.calls[0][1].body);
    expect(sent).toEqual(expect.objectContaining({ service_id: "svc-a", provider_id: "nurse-acc", payment_method: "card" }));
  });

  it("refuses a booking without a nurse, or paid in cash", async () => {
    expect((await book(req({ service_id: "svc-a", scheduled_at: future }))).status).toBe(400);
    expect((await book(req({ service_id: "svc-a", provider_id: "nurse-acc", scheduled_at: future, payment_method: "cash" }))).status).toBe(400);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });

  it("opens a card payment for the booking it just created", async () => {
    const id = "22222222-2222-4222-8222-222222222222";
    state.createPatientPaymentIntent.mockResolvedValue(new Response(JSON.stringify({ id: "33333333-3333-4333-8333-333333333333", status: "pending", checkout_url: "https://gateway.test/c" }), { status: 201 }));
    const r = new Request(`https://web.test/api/nursing/bookings/${id}/payment-intent`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "nursing-pay-key-1234" }, body: JSON.stringify({ method: "card" }) });
    const res = await payIntent(r, { params: Promise.resolve({ bookingId: id }) });
    expect(res.status).toBe(201);
    expect((await res.json()).checkoutUrl).toBe("https://gateway.test/c");
    expect(state.createPatientPaymentIntent).toHaveBeenCalledWith("server-access", "nursing", id, "nursing-pay-key-1234", "card");
  });

  it("reads the nurse as the API sends it and invents nothing", () => {
    const nurse = extractNurse({ data: { id: "nurse-acc", name_ar: "ممرضة", rating: null, years_experience: null, profile_photo: null, services: [{ id: "svc-a", name_ar: "حقن", name_en: "Injection", name: "حقن", price: 150, duration: "30" }] } })!;
    expect(nurse.rating).toBeUndefined();
    expect(nurse.experience_years).toBeUndefined();
    expect(nurse.specialty).toBeUndefined();
    expect(nurse.services).toEqual([expect.objectContaining({ id: "svc-a", name: "حقن", price: 150 })]);
    expect(extractNurse({ data: { id: "n2", name: "x", years_experience: 7, profile_photo: "https://cdn.test/p.jpg" } })).toEqual(expect.objectContaining({ experience_years: 7, avatar: "https://cdn.test/p.jpg" }));
  });

  it("the nurse page sends the nurse id, and the service page links to the nurses offering it", () => {
    const page = read("app/[locale]/nursing/nurses/[nurseId]/page.tsx");
    expect(page).toMatch(/<NursingBookingForm[^>]*nurseId=\{nurse\.id\}/);
    expect(page).not.toMatch(/24\/7|defaultBio/);
    expect(read("components-next/nursing-booking-form.tsx")).toMatch(/provider_id: nurseId/);
    expect(read("components-next/nursing-booking-form.tsx")).not.toMatch(/"cash"/);
    const service = read("app/[locale]/home-care/services/[serviceId]/page.tsx");
    expect(service).toMatch(/\/nursing\/nurses\/\$\{encodeURIComponent\(/);
    expect(read("lib/api/nursing-server.ts")).toMatch(/\/home-care\/providers\?type=/);
  });
});
