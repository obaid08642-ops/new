// ACCEPTANCE — D-31 (owner decision 31, "Double taps and bad networks"): BOOK on the web.
// Written by the reviewer before the work; the implementing agent makes it pass and may not edit it.
//
// Screens (the real components, rendered in a real DOM with the real react-dom client):
//  - consultation booking confirm        components-next/booking-flow.tsx (BookingFlow, /consultations/book/[doctorId])
//  - doctor profile booking form         components-next/appointment-booking-form.tsx (AppointmentBookingForm)
//  - lab booking confirm                 components-next/lab-booking-form.tsx (LabBookingForm)
//  - home-care (nursing) booking         components-next/nursing-booking-form.tsx (NursingBookingForm)
//  - lab/radiology checkout (order)      components-next/diagnostics-checkout-form.tsx (DiagnosticsCheckoutForm)
// Rules checked for each:
//  A1  two taps while the first booking request is in flight ("slow 3G") -> exactly ONE booking request reaches the
//      network, and the button is disabled (or the handler ignores the tap) while it is in flight;
//  A2  after a lost connection (fetch rejects with TypeError('Network request failed'): the server may have booked) the
//      next attempt sends the SAME Idempotency-Key, or asks the server for the result instead of booking again;
//  A3  after a definite server answer (a 4xx with a body) a new attempt is allowed (a new key is fine);
//  B   an action that fails for want of the server shows a clear error and KEEPS the user's input (slot, notes, …).
// Only the network boundary is faked (fetch). next/navigation and next-intl are the seams the existing tests use.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { button, deferred, fakeNetwork, isBusy, json, lost, messages, mount, pause, settle, tap, type, win } from "./harness";
import { expectOneWrite, expectRetryIsSafe } from "./rules";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }), usePathname: () => "/en", useSearchParams: () => new URLSearchParams() }));
vi.mock("next-intl", async () => (await import("../../tests/helpers/intl")).nextIntlMock("en"));

const { BookingFlow } = await import("@/components-next/booking-flow");
const { AppointmentBookingForm } = await import("@/components-next/appointment-booking-form");
const { LabBookingForm } = await import("@/components-next/lab-booking-form");
const { NursingBookingForm } = await import("@/components-next/nursing-booking-form");
const { DiagnosticsCheckoutForm } = await import("@/components-next/diagnostics-checkout-form");

const DOCTOR = "d0c70000-1111-4222-8333-444455556666";
const tomorrow = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
})();
const SLOT = tomorrow.toISOString();
const localInput = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}T10:00`;
const NOTES = "Pain since Monday, please call before";

type View = { container: HTMLElement; unmount: () => Promise<void> };
type Screen = {
  name: string;
  /** the booking request */
  write: RegExp;
  /** other writes that must not double either (e.g. the slot hold) */
  alsoOnce?: RegExp[];
  reads?: (path: string, method: string) => Response | undefined;
  /** writes that are answered at once (e.g. the slot hold before the booking) */
  helpers?: (path: string, method: string) => Response | undefined;
  open: () => Promise<View>;
  /** fills the form the way a patient does */
  fill: (c: HTMLElement) => Promise<void>;
  submit: (c: HTMLElement) => HTMLButtonElement;
  /** the patient's input as the screen shows it now */
  input: (c: HTMLElement) => Record<string, unknown>;
};

const pressed = (c: HTMLElement) => Array.from(c.querySelectorAll('button[aria-pressed="true"]')).map((b) => (b.textContent ?? "").trim());
const textareaValues = (c: HTMLElement) => Array.from(c.querySelectorAll("textarea")).map((t) => (t as HTMLTextAreaElement).value);
const inputValues = (c: HTMLElement) => Array.from(c.querySelectorAll("input")).map((i) => (i as HTMLInputElement).value);

const SCREENS: Screen[] = [
  {
    name: "consultation booking confirm (BookingFlow)",
    write: /^\/api\/appointments\/book$/,
    alsoOnce: [/^\/api\/slot-locks\/reserve$/],
    reads: (path) => (/\/api\/consultations\/doctors\/[^/]+\/slots$/.test(path) ? json(200, { slots: [{ start: SLOT, end: new Date(tomorrow.getTime() + 30 * 60_000).toISOString(), label: "10:00", available: true }] }) : undefined),
    helpers: (path) => (/^\/api\/slot-locks\/reserve$/.test(path) ? json(201, { id: "lock-1" }) : undefined),
    open: () => mount(createElement(BookingFlow, { doctorId: DOCTOR, locale: "en", doctor: null })),
    fill: async (c) => {
      const slot = c.querySelector('[role="group"][aria-label="Available slots"] button') as HTMLButtonElement | null;
      if (!slot) throw new Error("setup: no slot button rendered");
      await tap(slot);
      const notes = c.querySelector("textarea") as HTMLTextAreaElement;
      await type(notes, NOTES);
    },
    submit: (c) => button(c, /^Confirm booking$|^Booking…$/),
    input: (c) => ({ pressed: pressed(c), notes: textareaValues(c) }),
  },
  {
    name: "doctor profile booking form (AppointmentBookingForm)",
    write: /^\/api\/appointments\/book$/,
    open: () => mount(createElement(AppointmentBookingForm, { locale: "en", doctorId: DOCTOR, serviceType: "clinic", slots: [{ start: SLOT, label: "10:00", available: true }] })),
    fill: async (c) => {
      await tap(button(c, "10:00"));
      const [name, phone] = Array.from(c.querySelectorAll("input")) as HTMLInputElement[];
      await type(name, "Sara Ali");
      await type(phone, "0500000000");
      await type(c.querySelector("textarea") as HTMLTextAreaElement, NOTES);
    },
    submit: (c) => button(c, /^Confirm appointment$|^Confirming appointment…$/),
    input: (c) => ({ pressed: pressed(c), inputs: inputValues(c), notes: textareaValues(c) }),
  },
  {
    name: "lab booking confirm (LabBookingForm)",
    write: /^\/api\/patient\/labs\/bookings$/,
    open: () => mount(createElement(LabBookingForm, { locale: "en", serviceId: "svc-cbc", providerId: "lab-1", serviceName: "CBC", homeEligible: true })),
    fill: async (c) => {
      await type(c.querySelector('input[type="datetime-local"]') as HTMLInputElement, localInput);
    },
    submit: (c) => button(c, /^Confirm the booking$|^Booking…$/),
    input: (c) => ({ pressed: pressed(c), inputs: inputValues(c) }),
  },
  {
    name: "home-care booking (NursingBookingForm)",
    write: /^\/api\/nursing\/bookings$/,
    open: () => mount(createElement(NursingBookingForm, { locale: "en", services: [{ id: "svc-1", name: "Wound care" }], addresses: [{ id: "addr-1", label: "Home" }] })),
    fill: async (c) => {
      const dayButtons = Array.from(c.querySelectorAll("form > div")[0].querySelectorAll("button")) as HTMLButtonElement[];
      await tap(dayButtons[1]); // tomorrow
      await tap(button(c, "09:00"));
      await type(c.querySelector("textarea") as HTMLTextAreaElement, NOTES);
    },
    submit: (c) => button(c, /^Confirm booking$|^Booking…$/),
    input: (c) => ({ bold: Array.from(c.querySelectorAll("button")).filter((b) => (b as HTMLButtonElement).style.fontWeight === "800").map((b) => b.textContent), notes: textareaValues(c) }),
  },
  {
    name: "lab/radiology checkout order (DiagnosticsCheckoutForm)",
    write: /^\/api\/diagnostics\/orders$/,
    open: () => mount(createElement(DiagnosticsCheckoutForm, { locale: "en", items: ["lab_svc-cbc"], labId: "lab-1", initialLocation: "facility" })),
    fill: async (c) => {
      const days = Array.from(c.querySelectorAll('[role="group"][aria-label="Day"] button')) as HTMLButtonElement[];
      await tap(days[1]); // tomorrow
      const times = Array.from(c.querySelectorAll('[role="group"][aria-label="Time"] button')) as HTMLButtonElement[];
      await tap(times[0]);
    },
    submit: (c) => button(c, /^Confirm the booking$|^Booking…$/),
    input: (c) => ({ pressed: pressed(c) }),
  },
];

let view: View | null = null;
afterEach(async () => {
  await view?.unmount();
  view = null;
});

function network(screen: Screen, answerWrite: (n: number) => Promise<Response> | Response) {
  let n = 0;
  return fakeNetwork((call) => {
    const read = call.method === "GET" ? screen.reads?.(call.path, call.method) : undefined;
    if (read) return read;
    const helper = call.method !== "GET" ? screen.helpers?.(call.path, call.method) : undefined;
    if (helper) return helper;
    if (call.method !== "GET" && screen.write.test(call.path)) return answerWrite(++n);
    return undefined;
  });
}

async function openFilled(screen: Screen) {
  view = await screen.open();
  await screen.fill(view.container);
  await settle();
  return view;
}

describe.each(SCREENS)("BOOK — $name", (screen) => {
  it("A1: two taps on a slow network send ONE booking request, and the button is disabled while it is in flight", async () => {
    const slow = deferred();
    const net = network(screen, () => slow.promise);
    const { container } = await openFilled(screen);
    expect(await tap(screen.submit(container))).toBe("clicked");
    await settle();
    const submit = screen.submit(container);
    expect(isBusy(submit), `${screen.name}: the confirm button is still enabled while the booking request is in flight (label "${submit.textContent}")`).toBe(true);
    await tap(submit);
    await settle();
    expectOneWrite(screen.name, net.calls, screen.write);
    for (const other of screen.alsoOnce ?? []) expectOneWrite(screen.name, net.calls, other);
    slow.resolve(json(409, { message: "slot_taken" }));
    await settle();
  });

  it("A2 + B: after a lost connection the screen shows a clear error, keeps the input, and the retry sends the SAME Idempotency-Key (or asks for the result)", async () => {
    const net = network(screen, (n) => (n === 1 ? lost() : deferred().promise));
    const { container } = await openFilled(screen);
    const before = screen.input(container);
    await tap(screen.submit(container));
    await settle();
    expect(messages(container).length, `${screen.name}: no message on screen after the connection was lost`).toBeGreaterThan(0);
    expect(screen.input(container), `${screen.name}: the patient's input changed after the failed booking`).toEqual(before);
    const retry = screen.submit(container);
    expect(isBusy(retry), `${screen.name}: the patient cannot retry after a lost connection`).toBe(false);
    await pause(5);
    await tap(retry);
    await settle();
    expectRetryIsSafe(screen.name, net.calls, screen.write);
  });

  it("A3: after a definite server answer (4xx with a body) the patient may try again (a new key is allowed)", async () => {
    const net = network(screen, (n) => (n === 1 ? json(409, { message: "slot_taken" }) : deferred().promise));
    const { container } = await openFilled(screen);
    await tap(screen.submit(container));
    await settle();
    expect(messages(container).length, `${screen.name}: no message after the server refused`).toBeGreaterThan(0);
    await tap(screen.submit(container));
    await settle();
    expect(net.writes(screen.write).length, `${screen.name}: the second attempt after a 4xx was not sent`).toBe(2);
  });
});

describe("BOOK — offline (navigator.onLine = false, fetch fails)", () => {
  it("B: the consultation booking shows a clear error and keeps the slot and the notes", async () => {
    const screen = SCREENS[0];
    fakeNetwork((call) => (call.method === "GET" ? screen.reads?.(call.path, call.method) : lost()));
    const { container } = await openFilled(screen);
    const before = screen.input(container);
    Object.defineProperty(win.navigator, "onLine", { configurable: true, get: () => false });
    win.dispatchEvent(new win.Event("offline"));
    await tap(screen.submit(container));
    await settle();
    expect(messages(container).length, "no error shown when booking offline").toBeGreaterThan(0);
    expect(screen.input(container)).toEqual(before);
    Object.defineProperty(win.navigator, "onLine", { configurable: true, get: () => true });
  });
});
