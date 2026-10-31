import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  getPatientAppointments: vi.fn(),
  getPatientAppointment: vi.fn(),
  getVisitOutcomes: vi.fn(),
  getOutcomesBadge: vi.fn(),
  callPatientApi: vi.fn(),
  requirePatientAccess: vi.fn(),
  cookieToken: undefined as string | undefined,
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn() }), usePathname: () => "/en/consultations/doctors" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (state.cookieToken ? { value: state.cookieToken } : undefined) }) }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key), setRequestLocale: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true, getDirection: () => "ltr" }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/appointments-server", () => ({ getPatientAppointments: state.getPatientAppointments, getPatientAppointment: state.getPatientAppointment }));
vi.mock("@/lib/api/outcomes-server", () => ({ getVisitOutcomes: state.getVisitOutcomes, getOutcomesBadge: state.getOutcomesBadge }));
vi.mock("@/components-next/consult/outcomes-seen", () => ({ OutcomesSeen: ({ appointmentId }: { appointmentId: string }) => <i data-seen={appointmentId} /> }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("@/components-next/prescription-client", () => ({ PrescriptionClient: () => null }));
vi.mock("@/components-next/core/core-shell", async () => {
  const { createElement } = await import("react");
  return { CoreShell: ({ children, appointmentsHref }: { children: unknown; appointmentsHref?: string }) => createElement("div", { "data-appointments-href": appointmentsHref ?? "" }, children as never) };
});

import AppointmentsPage from "@/app/[locale]/appointments/page";
import AppointmentDetailPage from "@/app/[locale]/appointments/[appointmentId]/page";
import { GET as newCount } from "@/app/api/medical-reports/new-count/route";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { readBadgeCount, readOutcomes } from "@/lib/consult/outcomes";
import { isBooked, isCurrent, isPast } from "@/lib/consult/appointment-view";

/** Test values shaped like GET /care/appointments/:id/outcomes (backend appointment-outcomes.service.ts) and GET /care/appointments. */
const ID = "91047ef2-ad36-422a-a184-629693e7c729";
const outcomesBody = (over: Record<string, unknown> = {}) => ({
  appointment_id: ID, status: "completed", doctor_id: "d1", prescriptions: [], lab_tests: [], radiology_scans: [], referral: null, instructions: {}, seen_at: null, unseen_count: 1,
  sick_leaves_and_certificates: [{ id: "r1", report_type: "medical_certificate", certificate_kind: "sick_leave", title_en: "Test sick leave", sick_leave: { start_date: "2026-10-01T00:00:00.000Z", end_date: "2026-10-04T00:00:00.000Z", duration_days: 3 }, viewed_by_patient: false, is_new: true }],
  reports: [{ id: "r2", report_type: "consultation_note", title_en: "Test report", viewed_by_patient: true, is_new: false }],
  ...over,
});

describe("tabs and outcome helpers", () => {
  it("puts a status on one of three tabs", () => {
    expect([isBooked("CONFIRMED"), isCurrent("CONFIRMED"), isPast("CONFIRMED")]).toEqual([true, false, false]);
    expect([isBooked("in_progress"), isCurrent("in_progress"), isPast("in_progress")]).toEqual([false, true, false]);
    expect([isBooked("COMPLETED"), isCurrent("COMPLETED"), isPast("COMPLETED")]).toEqual([false, false, true]);
  });
  it("splits one visit's outcomes and reads the badge as unseen_total", () => {
    const o = readOutcomes(outcomesBody());
    expect(o.sickLeaves.map((r) => r.id)).toEqual(["r1"]);
    expect(o.sickLeaves[0].isNew).toBe(true);
    expect(o.reports.map((r) => r.id)).toEqual(["r2"]);
    expect(o.unseen).toBe(1);
    expect(readOutcomes("x").unseen).toBe(0);
    expect(readBadgeCount({ unseen_total: 4, appointments: [] })).toBe(4);
    expect(readBadgeCount(null)).toBe(0);
  });
});

describe("appointments page", () => {
  beforeEach(() => {
    Object.values(state).forEach((v) => typeof v === "function" && "mockReset" in v && (v as ReturnType<typeof vi.fn>).mockReset());
    state.requirePatientAccess.mockResolvedValue("tok");
    state.getPatientAppointments.mockImplementation(async () => new Response(JSON.stringify([
      { id: ID, service_type: "video", status: "CONFIRMED" },
      { id: "c1c1c1c1-0000-4000-8000-000000000001", service_type: "clinic", status: "IN_PROGRESS" },
    ]), { status: 200 }));
  });

  it("lists upcoming, current and past on their own tab", async () => {
    const upcoming = renderToStaticMarkup(await AppointmentsPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) }));
    expect(upcoming).toContain("tabCurrent");
    expect(upcoming).toContain(`/en/appointments/${ID}`);
    expect(upcoming).not.toContain("c1c1c1c1-0000");
    const current = renderToStaticMarkup(await AppointmentsPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ tab: "current" }) }));
    expect(current).toContain("c1c1c1c1-0000");
    expect(current).not.toContain(`/en/appointments/${ID}`);
  });

  it("draws the sick leave and report of a finished visit from the outcomes and marks them seen", async () => {
    state.getPatientAppointment.mockResolvedValue(new Response(JSON.stringify({ id: ID, service_type: "clinic", status: "COMPLETED", doctor_name: "Test Doctor" }), { status: 200 }));
    state.callPatientApi.mockResolvedValue(new Response("{}", { status: 404 }));
    state.getVisitOutcomes.mockResolvedValue(new Response(JSON.stringify(outcomesBody()), { status: 200 }));
    const html = renderToStaticMarkup(await AppointmentDetailPage({ params: Promise.resolve({ locale: "en", appointmentId: ID }) }));
    expect(html).toContain("Test sick leave");
    expect(html).toContain('href="/en/reports/r1"');
    expect(html).toContain("outcomeNew");
    expect(html).toContain("Test report");
    expect(html).not.toContain("appointment-certificates");
    expect(html).toContain(`data-seen="${ID}"`);
    expect(state.getVisitOutcomes).toHaveBeenCalledWith("tok", ID);
  });

  it("draws no outcome section when the server has none", async () => {
    state.getPatientAppointment.mockResolvedValue(new Response(JSON.stringify({ id: ID, service_type: "clinic", status: "COMPLETED", doctor_name: "Test Doctor" }), { status: 200 }));
    state.callPatientApi.mockResolvedValue(new Response("{}", { status: 404 }));
    state.getVisitOutcomes.mockResolvedValue(new Response(JSON.stringify(outcomesBody({ unseen_count: 0, sick_leaves_and_certificates: [], reports: [] })), { status: 200 }));
    const html = renderToStaticMarkup(await AppointmentDetailPage({ params: Promise.resolve({ locale: "en", appointmentId: ID }) }));
    expect(html).not.toContain("appointment-sick-leave");
    expect(html).not.toContain("appointment-reports");
    expect(html).not.toContain("data-seen");
  });
});

describe("consultations header and the new-results count", () => {
  it("hands the shell the My appointments link so it replaces the cart", () => {
    const html = renderToStaticMarkup(<ConsultPage locale="en" title="Doctors" appointmentsHref="/en/appointments">x</ConsultPage>);
    expect(html).toContain('data-appointments-href="/en/appointments"');
  });
  it("the count route answers the badge endpoint's unseen_total, 401 when signed out", async () => {
    state.cookieToken = undefined;
    expect((await newCount()).status).toBe(401);
    state.cookieToken = "tok";
    state.getOutcomesBadge.mockResolvedValue(new Response(JSON.stringify({ unseen_total: 2, appointments: [{ appointment_id: ID, unseen: 2 }] }), { status: 200 }));
    expect(await (await newCount()).json()).toEqual({ count: 2 });
  });
});
