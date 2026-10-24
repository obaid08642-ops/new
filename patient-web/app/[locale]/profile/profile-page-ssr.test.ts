import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ token: "profile-server-token-never-in-html", redirect: vi.fn(), responses: [] as Response[] }));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: state.redirect, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true, getDirection: () => "ltr", locales: ["ar", "en"] }));
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: unknown }) => children }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => state.token }));
// the three profile reads answer from the queue, in order; the shortcut value and the row counts are separate reads by path
vi.mock("@/lib/api/upstream", () => ({
  callPatientApi: async (path: string) => {
    if (path === "/loyalty/account") return new Response(JSON.stringify({ points: 1250 }), { status: 200 });
    if (path === "/users/me/addresses") return new Response(JSON.stringify([{ id: "a" }, { id: "b" }]), { status: 200 });
    if (path === "/family/members") return new Response(null, { status: 503 });
    return state.responses.shift()!;
  },
}));
vi.mock("@/lib/api/public-config-server", () => ({ getDisabledModules: async () => new Set<string>() }));

import ProfilePage from "./page";

describe("profile SSR boundary", () => {
  beforeEach(() => {
    state.token = "profile-server-token-never-in-html";
    state.redirect.mockReset();
    state.responses = [
      new Response(JSON.stringify({ fullName: "Visible patient", storage_key: "private-storage-key" }), { status: 200 }),
      new Response(JSON.stringify({ blood_type: "O+", internal_note: "clinical-private-note" }), { status: 200 }), // the field /medical-profile really sends (needs-review issue 770)
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

  it("shows the points on the shortcut and the address count, and leaves out a count whose read failed", async () => {
    const html = renderToStaticMarkup(await ProfilePage({ params: Promise.resolve({ locale: "en" }) }));

    expect(html).toContain("1,250");
    expect(html).toContain("addressCount");
    expect(html).not.toContain("familyCount");
  });

  it("redirects to sign-in when any profile domain reports an expired session", async () => {
    state.responses = [new Response(null, { status: 401 }), new Response(null, { status: 200 }), new Response(null, { status: 200 })];

    await ProfilePage({ params: Promise.resolve({ locale: "ar" }) });

    expect(state.redirect).toHaveBeenCalledWith("/ar/login");
  });
});
