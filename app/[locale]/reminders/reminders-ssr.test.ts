import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPatientMedicationReminders: vi.fn(), requirePatientAccess: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/reminders-server", () => ({ getPatientMedicationReminders: state.getPatientMedicationReminders }));

import RemindersPage from "./page";

const reminderId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-reminder-token-never-in-html";

describe("medication reminders SSR boundary", () => {
  beforeEach(() => {
    state.getPatientMedicationReminders.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("renders current reminder details only without identifier, patient id, instructions, log, refill metadata, or token", async () => {
    state.getPatientMedicationReminders.mockResolvedValue(new Response(JSON.stringify({ reminders: [{ id: reminderId, medicine_name_en: "Verified medicine", dose: "1 tablet", times: ["08:00"], frequency: "daily", patient_id: "private-patient", instructions_ar: "private-instructions", log: [{ status: "taken" }], refill_pending_order_id: "private-order", refill_creation_lock: "private-lock" }] }), { status: 200 }));

    const html = renderToStaticMarkup(await RemindersPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(state.getPatientMedicationReminders).toHaveBeenCalledWith(serverToken);
    expect(html).toContain("Verified medicine");
    expect(html).toContain("1 tablet");
    for (const secret of [serverToken, reminderId, "private-patient", "private-instructions", "private-order", "private-lock"]) expect(html).not.toContain(secret);
  });
});
