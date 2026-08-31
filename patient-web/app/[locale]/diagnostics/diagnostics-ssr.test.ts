import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getDiagnosticBookings: vi.fn(), getDiagnosticBooking: vi.fn(), getDiagnosticTracking: vi.fn(), requirePatientAccess: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/diagnostics-server", () => ({ getDiagnosticBookings: state.getDiagnosticBookings, getDiagnosticBooking: state.getDiagnosticBooking, getDiagnosticTracking: state.getDiagnosticTracking }));

import DiagnosticsPage from "./page";
import DiagnosticDetailPage from "./[domain]/[bookingId]/page";

const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-diagnostic-token-never-in-html";
const reportUrl = "https://example.test/private-report.pdf";

describe("diagnostics SSR boundary", () => {
  beforeEach(() => {
    state.getDiagnosticBookings.mockReset();
    state.getDiagnosticBooking.mockReset();
    state.getDiagnosticTracking.mockReset().mockResolvedValue(new Response(JSON.stringify({ steps: [] }), { status: 200 }));
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("renders list data through both server boundaries without embedding the token or sensitive fields", async () => {
    state.getDiagnosticBookings
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: bookingId, state: "CONFIRMED", patient_name: "private", total_price: 500 }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    const html = renderToStaticMarkup(await DiagnosticsPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(state.getDiagnosticBookings).toHaveBeenNthCalledWith(1, serverToken, "labs");
    expect(state.getDiagnosticBookings).toHaveBeenNthCalledWith(2, serverToken, "radiology");
    expect(html).not.toContain(serverToken);
    expect(html).not.toContain("private");
    expect(html).not.toContain("500");
    expect(html).toContain(`/en/diagnostics/labs/${bookingId}`);
  });

  it("renders detail through the server boundary without embedding patient or report data", async () => {
    state.getDiagnosticBooking.mockResolvedValue(new Response(JSON.stringify({ id: bookingId, state: "CONFIRMED", patient_phone: "private", reports: [{ url: reportUrl }], documents: [{ url_or_b64: reportUrl }], signed_report_pdf_url: reportUrl, total_price: 500 }), { status: 200 }));

    const html = renderToStaticMarkup(await DiagnosticDetailPage({ params: Promise.resolve({ locale: "en", domain: "labs", bookingId }) }));

    expect(state.getDiagnosticBooking).toHaveBeenCalledWith(serverToken, "labs", bookingId);
    expect(html).not.toContain(serverToken);
    expect(html).not.toContain("private");
    expect(html).not.toContain("500");
    expect(html).not.toContain(reportUrl);
    expect(html).toContain('href="/en/diagnostics"');
    expect(html).not.toMatch(/href="[^"]*(report|pdf)/i);
  });
});
