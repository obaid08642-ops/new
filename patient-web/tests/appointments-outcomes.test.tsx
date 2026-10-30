import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  getPatientAppointments: vi.fn(),
  getPatientAppointment: vi.fn(),
  getMyMedicalReports: vi.fn(),
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
vi.mock("@/lib/api/reports-server", () => ({ getMyMedicalReports: state.getMyMedicalReports }));
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
import { newOutcomeCount, outcomesOf } from "@/lib/consult/outcomes";
import { isBooked, isCurrent, isPast } from "@/lib/consult/appointment-view";

/** Test values shaped like GET /medical-reports/mine and GET /care/appointments. */
const ID = "91047ef2-ad36-422a-a184-629693e7c729";
const reports = [
  { id: "r1", appointment_id: ID, report_type: "medical_certificate", certificate_kind: "sick_leave", title_en: "Test sick leave", sick_leave: { start_date: "2026-10-01T00:00:00.000Z", end_date: "2026-10-04T00:00:00.000Z", duration_days: 3 }, viewed_by_patient: false },
  { id: "r2", appointment_id: ID, report_type: "consultation_note", title_en: "Test report", viewed_by_patient: true },
  { id: "r3", appointment_id: "other", report_type: "medical_certificate", viewed_by_patient: false },
  { id: "r4", report_type: "clinic_note", viewed_by_patient: false },
];

describe("tabs and outcome helpers", () => {
  it("puts a status on one of three tabs", () => {
    expect([isBooked("CONFIRMED"), isCurrent("CONFIRMED"), isPast("CONFIRMED")]).toEqual([true, false, false]);
    expect([isBooked("in_progress"), isCurrent("in_progress"), isPast("in_progress")]).toEqual([false, true, false]);
    expect([isBooked("COMPLETED"), isCurrent("COMPLETED"), isPast("COMPLETED")]).toEqual([false, false, true]);
  });
  it("counts only unopened results of a visit and splits one visit's results", () => {
    expect(newOutcomeCount(reports)).toBe(2);
    expect(outcomesOf(reports, ID).sickLeaves.map((r) => r.id)).toEqual(["r1"]);
    expect(outcomesOf(reports, ID).reports.map((r) => r.id)).toEqual(["r2"]);
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

  it("draws the sick leave and report of a finished visit from the medical reports", async () => {
    state.getPatientAppointment.mockResolvedValue(new Response(JSON.stringify({ id: ID, service_type: "clinic", status: "COMPLETED", doctor_name: "Test Doctor" }), { status: 200 }));
    state.callPatientApi.mockResolvedValue(new Response("{}", { status: 404 }));
    state.getMyMedicalReports.mockResolvedValue(new Response(JSON.stringify(reports), { status: 200 }));
    const html = renderToStaticMarkup(await AppointmentDetailPage({ params: Promise.resolve({ locale: "en", appointmentId: ID }) }));
    expect(html).toContain("Test sick leave");
    expect(html).toContain('href="/en/reports/r1"');
    expect(html).toContain("outcomeNew");
    expect(html).toContain("Test report");
    expect(html).not.toContain("appointment-certificates");
  });

  it("draws no outcome section when the server has none", async () => {
    state.getPatientAppointment.mockResolvedValue(new Response(JSON.stringify({ id: ID, service_type: "clinic", status: "COMPLETED", doctor_name: "Test Doctor" }), { status: 200 }));
    state.callPatientApi.mockResolvedValue(new Response("{}", { status: 404 }));
    state.getMyMedicalReports.mockResolvedValue(new Response("[]", { status: 200 }));
    const html = renderToStaticMarkup(await AppointmentDetailPage({ params: Promise.resolve({ locale: "en", appointmentId: ID }) }));
    expect(html).not.toContain("appointment-sick-leave");
    expect(html).not.toContain("appointment-reports");
  });
});

describe("consultations header and the new-results count", () => {
  it("hands the shell the My appointments link so it replaces the cart", () => {
    const html = renderToStaticMarkup(<ConsultPage locale="en" title="Doctors" appointmentsHref="/en/appointments">x</ConsultPage>);
    expect(html).toContain('data-appointments-href="/en/appointments"');
  });
  it("the count route answers the server's flag, 401 when signed out", async () => {
    state.cookieToken = undefined;
    expect((await newCount()).status).toBe(401);
    state.cookieToken = "tok";
    state.getMyMedicalReports.mockResolvedValue(new Response(JSON.stringify(reports), { status: 200 }));
    expect(await (await newCount()).json()).toEqual({ count: 2 });
  });
});
