import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPatientFamilyMembers: vi.fn(), requirePatientAccess: vi.fn() }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ refresh: () => {}, push: () => {} }) }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/family-server", () => ({ getPatientFamilyMembers: state.getPatientFamilyMembers }));

import FamilyPage from "./page";

const serverToken = "server-only-family-token-never-in-html";

describe("family SSR boundary", () => {
  beforeEach(() => {
    state.getPatientFamilyMembers.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("renders only member role and join date without identifier, permissions, or access token", async () => {
    state.getPatientFamilyMembers.mockResolvedValue(new Response(JSON.stringify({ members: [{ user_id: "private_member_123", role: "owner", joined_at: "2026-08-20T10:00:00.000Z", permissions: ["view_health", "view_prescriptions"] }] }), { status: 200 }));

    const html = renderToStaticMarkup(await FamilyPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(state.getPatientFamilyMembers).toHaveBeenCalledWith(serverToken);
    expect(html).not.toContain(serverToken);
    expect(html).not.toContain("private_member_123");
    expect(html).not.toContain("view_health");
    expect(html).not.toContain("view_prescriptions");
  }, 15_000);
});
