// dd9c105 (REVIEW_P13, Q15): the prescription detail page was a placeholder
// that only rendered "contractPending". It now reads the patient's own
// prescription from GET /prescriptions/:id (participant-only on the backend)
// and shows the doctor, date, state label and each medication's dose,
// frequency and duration.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({ getPatientPrescription: vi.fn(), requirePatientAccess: vi.fn(), notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));
vi.mock("next/navigation", () => ({ notFound: state.notFound, redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key), setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/components-next/retry-button", () => ({ RetryButton: () => null }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/prescriptions-server", () => ({ getPatientPrescription: state.getPatientPrescription, getPatientPrescriptions: vi.fn() }));

import PrescriptionDetailPage from "./page";

const id = "91047ef2-ad36-422a-a184-629693e7c729";
const params = Promise.resolve({ locale: "en", prescriptionId: id });

describe("prescription detail page (dd9c105)", () => {
  beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue("server-token"); state.getPatientPrescription.mockReset(); });

  it("renders the real prescription, not a placeholder", async () => {
    state.getPatientPrescription.mockResolvedValue(new Response(JSON.stringify({
      id, status: "CREATED_BY_DOCTOR", issued_at: "2026-09-01T10:00:00.000Z",
      doctor: { display_name: "د. سالم", specialty: "internal_medicine" },
      items: [{ name: "Amoxicillin 500mg", dose: "1 capsule", frequency: { every_hours: 8 }, duration: 7 }],
    }), { status: 200 }));
    const html = renderToStaticMarkup(await PrescriptionDetailPage({ params }));
    expect(state.getPatientPrescription).toHaveBeenCalledWith(id, "server-token");
    expect(html).not.toContain("contractPending");
    expect(html).toContain("Amoxicillin 500mg");
    expect(html).toContain("1 capsule");
    expect(html).toContain("د. سالم");
    expect(html).toContain("stateCreatedByDoctor");
    expect(html).not.toContain("CREATED_BY_DOCTOR");
    expect(html).not.toContain("server-token");
  });

  it("a prescription that is not the patient's is a 404", async () => {
    state.getPatientPrescription.mockResolvedValue(new Response("{}", { status: 404 }));
    await expect(PrescriptionDetailPage({ params })).rejects.toThrow("NOT_FOUND");
  });

  it("a backend failure shows an error with retry, never placeholder data", async () => {
    state.getPatientPrescription.mockResolvedValue(new Response("{}", { status: 503 }));
    const html = renderToStaticMarkup(await PrescriptionDetailPage({ params }));
    expect(html).toContain("unavailableTitle");
    expect(html).not.toContain("contractPending");
  });
});
