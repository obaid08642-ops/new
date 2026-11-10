import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  redirect: (to: string) => { throw new Error(`redirect:${to}`); },
  notFound: () => { throw new Error("not-found"); },
}));
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
  CoreShell: ({ children, title }: { children: ReactNode; title?: string }) => <div data-shell data-title={title}>{children}</div>,
}));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-token" }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: server.api }));

import ReportsListPage from "@/app/[locale]/medical-reports/page";
import ReportPage from "@/app/[locale]/medical-reports/[reportId]/page";
import VerifyPage from "@/app/[locale]/verify/sick-leave/[code]/page";

const ID = "91047ef2-ad36-422a-a184-629693e7c729";
const render = (node: ReactNode) => renderToStaticMarkup(node).replace(/ /g, " ");
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const WORDING = /sick leave/i;

beforeEach(() => server.api.mockReset());

describe("PT-08 medical reports on the web", () => {
  it("lists the reports with their period and Seha state, never called sick leave", async () => {
    server.api.mockResolvedValue(json([{ id: ID, serial: "MED-2026-000001", status: "issued", from: "2026-11-10", to: "2026-11-12", days: 3, doctor_name: "Dr Test", seha_status: "pending" }, { id: "r2-revoked-1", serial: "MED-2026-000002", status: "revoked", seha_status: "pending" }]));
    const html = render(await ReportsListPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(server.api).toHaveBeenCalledWith("/care/sick-leaves", expect.anything(), "server-only-token");
    expect(html).toContain("MED-2026-000001");
    expect(html).toContain("Seha registration: pending");
    expect(html).toContain("Revoked");
    expect(html).toContain(`/en/medical-reports/${ID}`);
    expect(html).not.toMatch(WORDING);
  });

  it("an empty list says so", async () => {
    server.api.mockResolvedValue(json([]));
    expect(render(await ReportsListPage({ params: Promise.resolve({ locale: "en" }) }))).toContain("No medical reports yet");
  });

  it("shows one report like the invoice: doctor, licence, full ID, rest period, Seha pending, the footer, PDF and verify links; the diagnosis only when sent", async () => {
    server.api.mockResolvedValue(json({ id: ID, serial: "MED-2026-000001", status: "issued", issued_at: "2026-11-09T10:00:00Z", from: "2026-11-10", to: "2026-11-12", days: 3, doctor_name: "Dr Test", doctor_specialty_en: "Cardiology", doctor_license_no: "SCFHS-1", patient_name: "Test Patient", national_id: "1234567890", consultation_at: "2026-11-09T09:00:00Z", booking_ref: "BK-1", reason: "Needs rest", diagnosis: null, verify_code: "ABCD2345", seha_status: "pending" }));
    const html = render(await ReportPage({ params: Promise.resolve({ locale: "en", reportId: ID }) }));
    for (const text of ["MED-2026-000001", "Dr Test", "Cardiology", "SCFHS-1", "Test Patient", "1234567890", "BK-1", "Recommended rest period", "Needs rest", "Seha registration: pending", "Official sick leave is issued via Seha. This is not a government document."]) expect(html).toContain(text);
    expect(html).toContain(`/api/patient/care/sick-leaves/${ID}/pdf`);
    expect(html).toContain("/en/verify/sick-leave/ABCD2345");
    expect(html).not.toContain("Diagnosis");
    expect(html.replace("Official sick leave is issued via Seha.", "")).not.toMatch(WORDING);
  });

  it("a report issued before the patient gave an ID number asks for it and holds the PDF back (owner decision 6)", async () => {
    server.api.mockResolvedValue(json({ id: ID, serial: "MED-2026-000002", status: "issued", issued_at: "2026-11-09T10:00:00Z", from: "2026-11-10", to: "2026-11-12", days: 3, doctor_name: "Dr Test", national_id: null, needs_national_id: true, verify_code: "ABCD2345" }));
    const html = render(await ReportPage({ params: Promise.resolve({ locale: "en", reportId: ID }) }));
    expect(html).toContain("Add your ID number to download this report.");
    expect(html).toContain('data-testid="national-id-form"');
    expect(html).not.toContain(`/api/patient/care/sick-leaves/${ID}/pdf`);
  });

  it("a registered report shows the Seha number; a revoked one says so with the reason", async () => {
    server.api.mockResolvedValue(json({ id: ID, serial: "MED-2026-000003", status: "revoked", revoke_reason: "Issued by mistake", seha_status: "registered", seha_number: "SEHA-77", diagnosis: "Flu" }));
    const html = render(await ReportPage({ params: Promise.resolve({ locale: "en", reportId: ID }) }));
    expect(html).toContain("Registered on Seha: SEHA-77");
    expect(html).toContain("Revoked: Issued by mistake");
    expect(html).toContain("Flu");
  });

  it("another patient's report (404) is not found", async () => {
    server.api.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(ReportPage({ params: Promise.resolve({ locale: "en", reportId: ID }) })).rejects.toThrow("not-found");
  });

  it("the public verify page calls the public route without a token and shows only the minimal fields", async () => {
    server.api.mockResolvedValue(json({ valid: true, status: "issued", serial: "MED-2026-000001", initials: "T. P.", from: "2026-11-10", to: "2026-11-12", days: 3, issued_at: "2026-11-09T10:00:00Z", seha_registered: false, patient_name: "MUST NOT SHOW", national_id: "1234567890", reason: "MUST NOT SHOW", diagnosis: "MUST NOT SHOW" }));
    const html = render(await VerifyPage({ params: Promise.resolve({ locale: "en", code: "abcd2345" }) }));
    expect(server.api).toHaveBeenCalledWith("/verify/sick-leave/ABCD2345", expect.anything());
    expect(server.api.mock.calls[0][2]).toBeUndefined();
    expect(html).toContain("Valid report");
    expect(html).toContain("T. P.");
    expect(html).not.toContain("MUST NOT SHOW");
    expect(html).not.toContain("1234567890");
  });

  it("a revoked code says so; an unknown code is not found; a malformed code never reaches the backend", async () => {
    server.api.mockResolvedValue(json({ valid: false, status: "revoked", serial: "MED-2026-000001", revoked_at: "2026-11-10T08:00:00Z" }));
    expect(render(await VerifyPage({ params: Promise.resolve({ locale: "en", code: "ABCD2345" }) }))).toContain("This report has been revoked");
    server.api.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(VerifyPage({ params: Promise.resolve({ locale: "en", code: "ABCD2345" }) })).rejects.toThrow("not-found");
    server.api.mockClear();
    await expect(VerifyPage({ params: Promise.resolve({ locale: "en", code: "../etc/passwd" }) })).rejects.toThrow("not-found");
    expect(server.api).not.toHaveBeenCalled();
  });
});
