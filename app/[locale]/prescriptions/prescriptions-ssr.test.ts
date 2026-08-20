import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPatientPrescriptions: vi.fn(), requirePatientAccess: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/prescriptions-server", () => ({ getPatientPrescriptions: state.getPatientPrescriptions }));

import PrescriptionsPage from "./page";

const prescriptionId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-prescription-token-never-in-html";
const fileUrl = "https://example.test/private-prescription.pdf";

describe("prescriptions SSR boundary", () => {
  beforeEach(() => {
    state.getPatientPrescriptions.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("renders bounded patient prescription metadata without diagnosis, instructions, file, or token", async () => {
    state.getPatientPrescriptions.mockResolvedValue(new Response(JSON.stringify({ prescriptions: [{ id: prescriptionId, state: "CREATED_BY_DOCTOR", createdAt: "2026-08-20T10:00:00.000Z", items: [{ medicine_name_ar: "private-medicine", dose: "private-dose", instructions: "private-instructions" }], patient_id: "private-patient", diagnosis: "private-diagnosis", notes: "private-notes", upload_image: fileUrl }] }), { status: 200 }));

    const html = renderToStaticMarkup(await PrescriptionsPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(state.getPatientPrescriptions).toHaveBeenCalledWith(serverToken);
    expect(html).toContain("CREATED_BY_DOCTOR");
    expect(html).toContain("private-medicine");
    for (const secret of [serverToken, prescriptionId, "private-dose", "private-instructions", "private-patient", "private-diagnosis", "private-notes", fileUrl]) expect(html).not.toContain(secret);
    expect(html).not.toMatch(/href="[^"]*private-prescription/i);
  });
});
