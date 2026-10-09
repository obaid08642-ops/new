import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({ api: vi.fn(), list: vi.fn(), one: vi.fn(), doctors: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  redirect: (to: string) => { throw new Error(`redirect:${to}`); },
  notFound: () => { throw new Error("not-found"); },
}));
// the real en messages through the real ICU translator, so a missing key or a bad message fails here
vi.mock("next-intl", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const messages = (await import("./helpers/intl")).messagesFor("en");
  return { useTranslations: (namespace?: string) => actual.createTranslator({ locale: "en", messages: messages as never, namespace: namespace as never, onError: (error) => { throw error; } }), useLocale: () => "en" };
});
vi.mock("next-intl/server", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const messages = (await import("./helpers/intl")).messagesFor("en");
  return {
    getTranslations: async (arg: string | { locale?: string; namespace?: string }) =>
      actual.createTranslator({ locale: "en", messages: messages as never, namespace: (typeof arg === "string" ? arg : arg.namespace) as never, onError: (error) => { throw error; } }),
    setRequestLocale: vi.fn(),
  };
});
vi.mock("@/components-next/core/core-shell", () => ({
  CoreShell: ({ children, title, backHref, footer }: { children: ReactNode; title?: string; backHref?: string; footer?: ReactNode }) => <div data-shell data-title={title} data-back={backHref}>{children}{footer}</div>,
}));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-consult-token" }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: server.api }));
vi.mock("@/lib/api/appointments-server", () => ({ getPatientAppointments: server.list, getPatientAppointment: server.one }));
vi.mock("@/lib/context/CartContext", () => ({ useCart: () => ({ addItem: vi.fn() }) }));
vi.mock("@/lib/api/doctors-server", () => ({ getPublicDoctors: server.doctors, getPublicDoctor: vi.fn(), getPublicDoctorSlots: vi.fn() }));

import AppointmentsPage from "@/app/[locale]/appointments/page";
import AppointmentDetailPage from "@/app/[locale]/appointments/[appointmentId]/page";
import AppointmentSummaryRedirect from "@/app/[locale]/appointments/[appointmentId]/summary/page";
import FollowUpRedirect from "@/app/[locale]/consultations/follow-up/page";
import PrescriptionRedirect from "@/app/[locale]/consultations/prescription/page";
import ClinicLocationRedirect from "@/app/[locale]/consultations/clinic-location/page";
import BookingStatusPage from "@/app/[locale]/consultations/booking-status/page";
import CancelReschedulePage from "@/app/[locale]/consultations/cancel-reschedule/page";
import ClinicConfirmRedirect from "@/app/[locale]/consultations/clinic-confirm/page";
import DoctorsPage from "@/app/[locale]/consultations/doctors/page";
import HomeVisitTrackingPage from "@/app/[locale]/consultations/home-visit-tracking/page";
import WaitingRoomPage from "@/app/[locale]/consultations/virtual-waiting-room/page";
import { AppointmentCard } from "@/components-next/consult/appointment-card";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Facts } from "@/components-next/consult/consult-parts";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { ProfileHeader } from "@/components-next/consult/profile-header";
import { BookingFlow } from "@/components-next/booking-flow";
import { KNOWN_STATUSES, isDone, isJoinable, isOpen, isPast, isUpcoming, statusKey } from "@/lib/consult/appointment-view";

const ID = "91047ef2-ad36-422a-a184-629693e7c729";
const TOKEN = "server-only-consult-token";
const render = (node: ReactNode) => renderToStaticMarkup(node).replace(/ /g, " ");
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const row = (over: Record<string, unknown> = {}) => ({ id: ID, service_type: "video", status: "CONFIRMED", slot_start: "2026-10-08T10:00:00.000Z", doctor_name: "Dr. Test", specialty: "Cardiology", ...over });

beforeEach(() => { server.api.mockReset(); server.list.mockReset(); server.one.mockReset(); server.doctors.mockReset(); });

describe("the templates", () => {
  it("the page frame carries the title and the way back to the shell, and the h1 for wide screens", () => {
    const html = render(<ConsultPage locale="en" title="Booking" backHref="/en/appointments"><p>body</p></ConsultPage>);
    expect(html).toContain('data-title="Booking"');
    expect(html).toContain('data-back="/en/appointments"');
    expect(html).toContain("<h1");
    expect(html).toContain("body");
  });

  it("label and value rows draw every row, and a tile only when the row has an icon", () => {
    const html = render(<Facts rows={[{ label: "Clinic", value: "Main", icon: "hospital" }, { label: "Phone", value: "123" }]} />);
    expect(html).toContain("Clinic");
    expect(html).toContain("Main");
    expect(html).toContain("Phone");
    expect(html.match(/nabd-ficon/g)?.length ?? 0).toBeGreaterThan(0);
  });

  it("the states: an error offers the retry label it was given, an empty state its action", () => {
    expect(render(<ConsultState kind="error" title="Cannot load" body="Later" retryLabel="Try again" />)).toContain("Try again");
    const empty = render(<ConsultState kind="empty" title="Nothing" body="No items" actionLabel="Find" actionHref="/en/x" />);
    expect(empty).toContain("Nothing");
    expect(empty).toContain("Find");
  });

  it("the segmented links mark the chosen option and keep each option a real link", () => {
    const html = render(<LinkSegmented label="Tabs" value="past" options={[{ value: "upcoming", label: "Upcoming", href: "/en/a?tab=upcoming" }, { value: "past", label: "Past", href: "/en/a?tab=past" }]} />);
    expect(html).toContain('href="/en/a?tab=past"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("the appointment card shows the title, both chips and its actions as links; without actions it is only the link", () => {
    const html = render(<ul><AppointmentCard locale="en" href="/en/appointments/x" title="Dr. Test" mode="video" modeLabel="Video consultation" statusLabel="Confirmed" statusTone="mint" slotStart="2026-10-08T10:00:00.000Z" specialty="Cardiology" primary={{ href: "/en/p", label: "Enter" }} secondary={{ href: "/en/s", label: "Edit" }} /></ul>);
    for (const text of ["Dr. Test", "Video consultation", "Confirmed", "Cardiology", 'href="/en/p"', 'href="/en/s"']) expect(html).toContain(text);
    expect(render(<ul><AppointmentCard locale="en" href="/en/appointments/x" title="T" mode={null} statusLabel="Pending" statusTone="amber" /></ul>)).not.toContain("nabd-button");
  });

  it("the profile header draws only the figures it is given", () => {
    const none = render(<ProfileHeader line="Cardiology" />);
    expect(none).not.toContain("<dl");
    const some = render(<ProfileHeader line="Cardiology" stats={[{ value: "4.8", label: "Rating" }]} tags={["Insurance"]} />);
    expect(some).toContain("4.8");
    expect(some).toContain("Insurance");
  });
});

describe("the status helpers", () => {
  it("know the statuses the backend sends, in any case, and never pass an unknown code through", () => {
    expect(statusKey("CONFIRMED")).toBe("confirmed");
    expect(statusKey("PENDING_PAYMENT")).toBe("pending_payment");
    expect(statusKey("SOMETHING_NEW")).toBeNull();
    expect(isUpcoming("PENDING") && isPast("COMPLETED") && isOpen("SCHEDULED") && isJoinable("CHECKED_IN") && isDone("completed")).toBe(true);
    expect(isOpen("COMPLETED") || isJoinable("PENDING")).toBe(false);
  });

  it("puts every known status in exactly one of the two tabs, in any case", () => {
    for (const status of KNOWN_STATUSES) {
      expect([isUpcoming(status), isPast(status)].filter(Boolean)).toHaveLength(1);
      expect([isUpcoming(status.toUpperCase()), isPast(status.toUpperCase())].filter(Boolean)).toHaveLength(1);
    }
    expect(isUpcoming("pending_payment") && isUpcoming("SCHEDULED") && isUpcoming("in_progress") && isPast("no_show")).toBe(true);
  });
});

describe("the appointment screens", () => {
  it("the list sends each mode to the screen that fits it and never prints a raw status code or the token", async () => {
    server.list.mockResolvedValue(json([row(), row({ id: "11111111-ad36-422a-a184-629693e7c729", service_type: "clinic" }), row({ id: "22222222-ad36-422a-a184-629693e7c729", service_type: "home" })]));
    const html = render(await AppointmentsPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(server.list).toHaveBeenCalledWith(TOKEN);
    expect(html).toContain(`/en/consultations/virtual-waiting-room?appointmentId=${ID}`);
    expect(html).toContain("view=location");
    expect(html).toContain("home-visit-tracking?appointmentId=");
    expect(html).toContain("Confirmed");
    expect(html).not.toContain("CONFIRMED");
    expect(html).not.toContain(TOKEN);
  });

  it("the past tab lists finished appointments with only the details action", async () => {
    server.list.mockResolvedValue(json([row({ status: "COMPLETED" }), row({ id: "11111111-ad36-422a-a184-629693e7c729" })]));
    const html = render(await AppointmentsPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ tab: "past" }) }));
    expect(html).toContain("Completed");
    expect(html).not.toContain("cancel-reschedule");
    expect(html).not.toContain("virtual-waiting-room");
  });

  it("the detail shows the actions the status allows: open ones get cancel and reschedule, done ones the summary section", async () => {
    server.one.mockResolvedValueOnce(json(row()));
    const open = render(await AppointmentDetailPage({ params: Promise.resolve({ locale: "en", appointmentId: ID }) }));
    expect(open).toContain("Cancel appointment");
    expect(open).toContain("Reschedule appointment");
    expect(open).toContain(`booking-status?appointmentId=${ID}`);
    server.one.mockResolvedValueOnce(json(row({ status: "COMPLETED", doctor_id: "d1", patient_notes: "Cough", state_history: [{ state: "CONFIRMED", at: "2026-10-01T10:00:00.000Z" }, { state: "COMPLETED", at: "2026-10-08T11:00:00.000Z" }] })));
    server.api.mockResolvedValueOnce(json({ data: { diagnosis: "Flu", notes: "Rest", recommendations: "Fluids", prescription: [{ name: "Paracetamol", dose: "500 mg" }], follow_up_recommended: true, follow_up_window_days: 5 } }));
    const done = render(await AppointmentDetailPage({ params: Promise.resolve({ locale: "en", appointmentId: ID }) }));
    for (const text of ["Consultation summary", "Flu", "Rest", "Fluids", "Paracetamol", "Follow-up recommended within 5 days", `/en/consultations/book/d1?followUp=${ID}`, `/en/appointments/${ID}/chat`, "Cough", "Status history", "Prescription"]) expect(done).toContain(text);
    expect(done).not.toContain("Cancel appointment");
    expect(done).not.toContain("/summary");
  });

  it("the detail says the summary is not ready on a 404, and shows no follow-up window the server did not state", async () => {
    server.one.mockResolvedValueOnce(json(row({ status: "COMPLETED", doctor_id: "d1" })));
    server.api.mockResolvedValueOnce(json({}, 404));
    const html = render(await AppointmentDetailPage({ params: Promise.resolve({ locale: "en", appointmentId: ID }) }));
    expect(html).toContain("Summary not ready yet");
    expect(html).not.toContain("Follow-up recommended");
  });

  it("the merged pages redirect and keep the query", async () => {
    const go = async (fn: Promise<unknown>) => { try { await fn; } catch (error) { return (error as Error).message; } return "none"; };
    expect(await go(AppointmentSummaryRedirect({ params: Promise.resolve({ locale: "en", appointmentId: ID }) }))).toBe(`redirect:/en/appointments/${ID}`);
    expect(await go(FollowUpRedirect({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ id: ID }) }))).toBe(`redirect:/en/appointments/${ID}`);
    expect(await go(PrescriptionRedirect({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID }) }))).toBe(`redirect:/en/appointments/${ID}`);
    expect(await go(PrescriptionRedirect({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) }))).toBe("redirect:/en/appointments");
    expect(await go(ClinicConfirmRedirect({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID, view: "location" }) }))).toBe(`redirect:/en/consultations/booking-status?appointmentId=${ID}&view=location`);
    expect(await go(ClinicLocationRedirect({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID }) }))).toBe(`redirect:/en/consultations/booking-status?view=location&appointmentId=${ID}`);
  });

  it("booking status, cancel and reschedule, clinic confirm and the waiting room read the one appointment and gate on its status", async () => {
    server.api.mockImplementation(async (path: string) => (path === "/system-config/public" ? json({ cancellation_policy: { full_hours: 24, half_hours: 12, half_refund_percent: 50 } }) : json(row({ slot_start: new Date(Date.now() + 48 * 3600000).toISOString() }))));
    const status = render(await BookingStatusPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID }) }));
    expect(status).toContain("Enter waiting room");
    const cancel = render(await CancelReschedulePage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID }) }));
    expect(cancel).toContain("Cancellation and refund policy");
    expect(cancel).toContain("24 hours or more before: 100% refund");
    expect(cancel).toContain("12 to 24 hours before: 50% refund");
    expect(cancel).toContain("Expected refund: 100%");
    // the numbers are the server's: another policy changes the sentences, and without one nothing is assumed
    server.api.mockImplementation(async (path: string) => (path === "/system-config/public" ? json({ cancellation_policy: { full_hours: 48, half_hours: 6, half_refund_percent: 30 } }) : json(row())));
    expect(render(await CancelReschedulePage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID }) }))).toContain("48 hours or more before: 100% refund");
    server.api.mockImplementation(async (path: string) => (path === "/system-config/public" ? json({}, 503) : json(row())));
    const none = render(await CancelReschedulePage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID }) }));
    expect(none).toContain("policy is not available");
    expect(none).not.toContain("Expected refund");
    server.api.mockImplementation(async () => json(row()));
    const wait = render(await WaitingRoomPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID }) }));
    expect(wait).toContain("Secure video visit");
    server.api.mockImplementation(async () => json(row({ status: "PENDING" })));
    expect(render(await WaitingRoomPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID }) }))).toContain("The call opens once the appointment is confirmed and due.");
  });

  it("a confirmed clinic booking shows its confirmation on booking status (the same appointment), and the location view leaves the policy out", async () => {
    server.api.mockImplementation(async (path: string) => (path.includes("/care/doctors/") ? json({ clinic_name: "Test Clinic", clinic_address: "Olaya St", clinic_phone: "+966500000000" }) : path === "/system-config/public" ? json({ cancellation_policy: { full_hours: 24, half_hours: 4, half_refund_percent: 50 } }) : json(row({ service_type: "clinic", doctor_id: "d1" }))));
    const html = render(await BookingStatusPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID }) }));
    for (const text of ["NABDAH:APPT:91047EF2", "Test Clinic", "Olaya St", "tel:+966500000000", "Before your visit", "4 to 24 hours before: 50% refund", `/en/appointments/${ID}/chat`]) expect(html).toContain(text);
    const location = render(await BookingStatusPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID, view: "location" }) }));
    expect(location).toContain("Test Clinic");
    expect(location).not.toContain("Before your visit");
    server.api.mockImplementation(async () => json(row({ service_type: "clinic", status: "PENDING" })));
    expect(render(await BookingStatusPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID }) }))).not.toContain("Before your visit");
  });

  it("the home visit steps follow the server's status, and an unknown status marks none", async () => {
    // The backend has no en-route state; CHECKED_IN (doctor at the door) is the "arrived" step (needs-review issue 406).
    server.one.mockResolvedValueOnce(json(row({ service_type: "home", status: "CHECKED_IN" })));
    const html = render(await HomeVisitTrackingPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID }) }));
    expect(html).toContain("Provider arrived");
    expect(html).not.toContain("Provider on the way");
    expect(html).toContain('aria-current="step"');
    server.one.mockResolvedValueOnce(json(row({ status: "MYSTERY" })));
    expect(render(await HomeVisitTrackingPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ appointmentId: ID }) }))).toContain("Unknown status");
  });
});

describe("the doctors list", () => {
  it("draws a card per doctor with the modes it offers, the rating only with a review count, and no invented photo or verification", async () => {
    server.doctors.mockResolvedValue(json([
      { id: "doc-1", name_en: "Doctor One", price_clinic: 150, consultation_modes: ["clinic", "video"], rating: 4.8, review_count: 12, hospital: "City Hospital" },
      { id: "doc-2", name_en: "Doctor Two", rating: 4.5 },
    ]));
    const html = render(await DoctorsPage({ params: Promise.resolve({ locale: "en" }) }));
    for (const text of ["Doctor One", "Doctor Two", "/en/consultations/doctors/doc-1", "City Hospital", "Clinic", "Video"]) expect(html).toContain(text);
    expect(html.match(/nabd-rating--sm/g)).toHaveLength(1);
    expect(html).toContain("(12)");
    expect(html).not.toContain("/images/doctors/");
    expect(html).not.toContain("<img");
  });
});

describe("the booking screen", () => {
  it("keeps the confirm bar disabled until a slot is chosen, offers cash for the clinic visit only, and shows no raw error code", () => {
    const html = render(<BookingFlow doctorId="doc-1" locale="en" doctor={{ id: "doc-1", name: "Doctor One", specialty: "Cardiology", price: 150, online: true, clinic: true, home: true, acceptsInsurance: false }} />);
    expect(html).toContain("Doctor One");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Confirm booking/);
    expect(html).toContain("Cash");
    expect(html).toContain("Home visit");
    expect(html).not.toContain("booking_failed");
  });

  it("shows the cancellation and refund terms before the payment card when the page passes them (decision 26)", () => {
    const html = render(<BookingFlow doctorId="doc-1" locale="en" doctor={null} policy={{ title: "Cancellation and refund policy", lines: ["24 hours or more before: 100% refund"] }} />);
    expect(html).toContain("Cancellation and refund policy");
    expect(html).toContain("24 hours or more before: 100% refund");
    expect(html.indexOf("Cancellation and refund policy")).toBeGreaterThan(html.indexOf("book-payment"));
  });
});
