import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));

import { HomeCareBookingForm, createHomeCareBookingAttempt } from "@/components-next/home-care-booking-form";

/** journeys#60 (issue 1069): home nursing booked on the website. Every value is a TEST value. */
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const props = { locale: "en", serviceId: "svc-wound", nurses: [{ id: "nurse-1", name: "Nurse Test" }], addresses: [{ id: "addr-1", label: "Home" }], insurance: false };
const html = (extra: Partial<typeof props> = {}) => renderToStaticMarkup(<HomeCareBookingForm {...props} {...extra} />);
const input = { nurseId: "nurse-1", serviceId: "svc-wound", slot: "2026-10-20T09:00:00.000Z", addressId: "addr-1", notes: "  ring twice  ", method: "card" as const };

describe("the home nursing booking form", () => {
  it("draws the nurses, the 7 days, the saved address and no fixed times (the times are the nurse's own slots)", () => {
    const out = html();
    expect(out).toContain("Nurse Test");
    expect(out).toContain("Home");
    expect(out).toContain("Loading the free times");
    expect(out).not.toMatch(/09:00|10:30|17:00/);
    expect(out.match(/id="home-care-day"[\s\S]*?<\/section>/)?.[0].match(/<button/g)).toHaveLength(7);
    expect(out).not.toContain("style=");
  });

  it("offers insurance only when the service has it, and never cash", () => {
    expect(html()).not.toContain("Insurance");
    expect(html({ insurance: true })).toContain("Insurance");
    expect(html({ insurance: true })).not.toMatch(/>Cash</);
  });

  it("says so when no nurse offers the service, and draws no form", () => {
    const out = html({ nurses: [] });
    expect(out).toContain("No nurse offers this service");
    expect(out).not.toContain("<button");
  });
});

describe("the booking request", () => {
  it("books with the nurse, the slot, the saved address and the method, with an idempotency key", async () => {
    const send = vi.fn().mockResolvedValue(json({ id: "b-1" }, 201));
    expect(await createHomeCareBookingAttempt(send as unknown as typeof fetch, () => "key-0000000000000001")(input)).toEqual({ ok: true, id: "b-1" });
    const [url, init] = send.mock.calls[0];
    expect(url).toBe("/api/nursing/bookings");
    expect(init.headers["idempotency-key"]).toBe("key-0000000000000001");
    expect(JSON.parse(init.body)).toEqual({ provider_id: "nurse-1", service_id: "svc-wound", scheduled_at: "2026-10-20T09:00:00.000Z", address_id: "addr-1", notes: "ring twice", payment_method: "card" });
  });

  it("sends the current position instead of a saved address when the patient chose it", async () => {
    const send = vi.fn().mockResolvedValue(json({ id: "b-2" }, 201));
    await createHomeCareBookingAttempt(send as unknown as typeof fetch, () => "key-0000000000000002")({ ...input, addressId: "", location: { lat: 24.7, lng: 46.6 } });
    const body = JSON.parse(send.mock.calls[0][1].body);
    expect(body.location).toEqual({ lat: 24.7, lng: 46.6 });
    expect(body).not.toHaveProperty("address_id");
  });

  it("retries a lost connection with the same key, and takes a new key after a definite answer", async () => {
    let n = 0;
    const send = vi.fn().mockImplementation(() => (n++ === 0 ? Promise.reject(new TypeError("Network request failed")) : Promise.resolve(json({ message: "slot_taken" }, 409))));
    let k = 0;
    const book = createHomeCareBookingAttempt(send as unknown as typeof fetch, () => `key-${String(++k).padStart(16, "0")}`);
    await expect(book(input)).rejects.toThrow("Network request failed");
    expect(await book(input)).toEqual({ ok: false, status: 409, code: "slot_taken" });
    send.mockResolvedValue(json({ id: "b-2" }, 201));
    expect(await book(input)).toEqual({ ok: true, id: "b-2" });
    const keys = send.mock.calls.map(([, init]) => init.headers["idempotency-key"]);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[1]);
  });
});
