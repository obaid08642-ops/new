import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const state = vi.hoisted(() => ({ getPatientPrescriptions: vi.fn(), callPatientApi: vi.fn(), requirePatientAccess: vi.fn(), notFound: vi.fn(() => { throw new Error("not_found"); }) }));

vi.mock("next/navigation", () => ({ notFound: state.notFound, redirect: vi.fn(), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
// keys and their values, so a test can see which message and which numbers a row asked for
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key), setRequestLocale: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/prescriptions-server", () => ({ getPatientPrescriptions: state.getPatientPrescriptions }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
// the shell is a client component with its own tests (core-screens); the page's own markup is what is under test here
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: ReactNode }) => <div data-shell>{children}</div> }));

import PrescriptionsPage from "./page";
import PrescriptionDetailPage from "./[prescriptionId]/page";

const prescriptionId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-prescription-token-never-in-html";
const fileUrl = "https://example.test/private-prescription.pdf";

describe("prescriptions list SSR boundary", () => {
  beforeEach(() => {
    state.getPatientPrescriptions.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("renders bounded patient prescription metadata without diagnosis, instructions, file, or token", async () => {
    state.getPatientPrescriptions.mockResolvedValue(new Response(JSON.stringify({ prescriptions: [{ id: prescriptionId, state: "CREATED_BY_DOCTOR", createdAt: "2026-08-20T10:00:00.000Z", items: [{ medicine_name_ar: "visible-medicine", dose: "private-dose", instructions: "private-instructions" }], patient_id: "private-patient", diagnosis: "private-diagnosis", notes: "private-notes", upload_image: fileUrl }] }), { status: 200 }));

    const html = renderToStaticMarkup(await PrescriptionsPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(state.getPatientPrescriptions).toHaveBeenCalledWith(serverToken);
    // F32: the raw state enum must never reach the user: only its translation key.
    expect(html).toContain("stateCreatedByDoctor");
    expect(html).not.toContain("CREATED_BY_DOCTOR");
    expect(html).toContain("visible-medicine");
    // each row opens its own detail page (the patient's bounded view), so its id is in the link and nowhere else
    expect(html).toContain(`href="/en/prescriptions/${prescriptionId}"`);
    for (const secret of [serverToken, "private-dose", "private-instructions", "private-patient", "private-diagnosis", "private-notes", fileUrl]) expect(html).not.toContain(secret);
    expect(html).not.toMatch(/href="[^"]*private-prescription/i);
    expect(html).not.toContain("style=");
  });

  it("says there are none, with the way to upload one, instead of drawing an empty list", async () => {
    state.getPatientPrescriptions.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    const html = renderToStaticMarkup(await PrescriptionsPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(html).toContain("emptyTitle");
    expect(html).not.toContain("<ul");
  });

  it("shows the retry state when the list cannot be read", async () => {
    state.getPatientPrescriptions.mockResolvedValue(new Response(null, { status: 503 }));
    const html = renderToStaticMarkup(await PrescriptionsPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("unavailableTitle");
  });
});

describe("prescription detail", () => {
  beforeEach(() => {
    state.callPatientApi.mockReset();
    state.notFound.mockClear();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("reads the patient's own bounded view (GET /prescriptions/:id) and draws each medicine's dose, frequency and duration", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: prescriptionId, status: "APPROVED", items: [{ name: "Metformin", dose: "500 mg", frequency: { every_hours: 8 }, duration: 30 }, { name: "Vitamin D", dose: null, frequency: { times_per_day: 1 }, duration: null }], issued_at: "2026-08-20T10:00:00.000Z", doctor: { display_name: "Dr Sara", specialty: "Endocrinology" }, diagnosis: "private-diagnosis", upload_image: fileUrl }), { status: 200 }));

    const html = renderToStaticMarkup(await PrescriptionDetailPage({ params: Promise.resolve({ locale: "en", prescriptionId }) }));

    expect(state.callPatientApi).toHaveBeenCalledWith(`/prescriptions/${prescriptionId}`, {}, serverToken);
    expect(html).toContain("Metformin");
    expect(html).toContain('dose:{&quot;dose&quot;:&quot;500 mg&quot;}');
    expect(html).toContain('everyHours:{&quot;hours&quot;:8}');
    expect(html).toContain('durationDays:{&quot;days&quot;:30}');
    expect(html).toContain('timesPerDay:{&quot;count&quot;:1}');
    expect(html).toContain("Dr Sara · Endocrinology");
    expect(html).toContain("stateApproved");
    expect(html).toContain(`prescriptionId=${prescriptionId}`); // the way to order from it
    for (const secret of [serverToken, "private-diagnosis", fileUrl]) expect(html).not.toContain(secret);
  });

  it("does not offer to order from a dispensed prescription", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: prescriptionId, status: "DISPENSED", items: [{ name: "Metformin" }] }), { status: 200 }));
    const html = renderToStaticMarkup(await PrescriptionDetailPage({ params: Promise.resolve({ locale: "en", prescriptionId }) }));
    expect(html).toContain("notOrderable");
    expect(html).not.toContain("orderCta");
  });

  it("answers not found for a prescription that is not the patient's (the API says 404) and for an id that is not an id", async () => {
    state.callPatientApi.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(PrescriptionDetailPage({ params: Promise.resolve({ locale: "en", prescriptionId }) })).rejects.toThrow("not_found");
    await expect(PrescriptionDetailPage({ params: Promise.resolve({ locale: "en", prescriptionId: "../x" }) })).rejects.toThrow("not_found");
  });

  it("shows the retry state when the prescription cannot be read", async () => {
    state.callPatientApi.mockResolvedValue(new Response(null, { status: 503 }));
    const html = renderToStaticMarkup(await PrescriptionDetailPage({ params: Promise.resolve({ locale: "en", prescriptionId }) }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("detailUnavailableTitle");
  });
});
