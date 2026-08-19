import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPatientVitalSummary: vi.fn(), requirePatientAccess: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/vitals-server", () => ({ getPatientVitalSummary: state.getPatientVitalSummary }));

import HealthPage from "./page";

const serverToken = "server-only-vitals-token-never-in-html";

describe("vital summary SSR boundary", () => {
  beforeEach(() => {
    state.getPatientVitalSummary.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("renders the allowed measurement only without patient id, source, notes, or token", async () => {
    state.getPatientVitalSummary.mockResolvedValue(new Response(JSON.stringify([{ key: "heart_rate", value: "72", unit: "bpm", measured_at: "2026-08-20T10:00:00.000Z", patient_id: "private-patient", source: "private-device", notes: "private-note", id: "private-reading" }]), { status: 200 }));

    const html = renderToStaticMarkup(await HealthPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(state.getPatientVitalSummary).toHaveBeenCalledWith(serverToken);
    expect(html).toContain("72 bpm");
    expect(html).not.toContain(serverToken);
    expect(html).not.toContain("private-patient");
    expect(html).not.toContain("private-device");
    expect(html).not.toContain("private-note");
    expect(html).not.toContain("private-reading");
  });
});
