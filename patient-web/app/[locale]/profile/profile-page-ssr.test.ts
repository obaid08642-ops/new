import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ token: "profile-server-token-never-in-html", redirect: vi.fn(), responses: [] as Response[] }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: state.redirect, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => state.token }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: async () => state.responses.shift()! }));

import ProfilePage from "./page";

describe("profile SSR boundary", () => {
  beforeEach(() => {
    state.token = "profile-server-token-never-in-html";
    state.redirect.mockReset();
    state.responses = [
      new Response(JSON.stringify({ fullName: "Visible patient", storage_key: "private-storage-key" }), { status: 200 }),
      new Response(JSON.stringify({ bloodType: "O+", internal_note: "clinical-private-note" }), { status: 200 }),
      new Response(null, { status: 503 }),
    ];
  });

  it("renders allowed fields and an error state without serializing sensitive keys or the session token", async () => {
    const html = renderToStaticMarkup(await ProfilePage({ params: Promise.resolve({ locale: "en" }) }));

    expect(html).toContain("Visible patient");
    expect(html).toContain("O+");
    expect(html).toContain("unavailable");
    expect(html).not.toContain(state.token);
    expect(html).not.toContain("private-storage-key");
    expect(html).not.toContain("clinical-private-note");
  });

  it("redirects to sign-in when any profile domain reports an expired session", async () => {
    state.responses = [new Response(null, { status: 401 }), new Response(null, { status: 200 }), new Response(null, { status: 200 })];

    await ProfilePage({ params: Promise.resolve({ locale: "ar" }) });

    expect(state.redirect).toHaveBeenCalledWith("/ar/login");
  });
});
