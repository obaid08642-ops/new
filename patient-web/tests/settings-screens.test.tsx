import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({ api: vi.fn(), privacy: vi.fn(), storage: vi.fn(), security: vi.fn(), sessions: vi.fn(), addresses: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  redirect: (to: string) => { throw new Error(`redirect:${to}`); },
  notFound: () => { throw new Error("not-found"); },
}));
// the real en messages through the real ICU translator, so a missing key or a bad message fails here
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
  CoreShell: ({ children, title, backHref }: { children: ReactNode; title?: string; backHref?: string }) => <div data-shell data-title={title} data-back={backHref}>{children}</div>,
}));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-token" }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: server.api }));
vi.mock("@/lib/api/settings-server", () => ({
  getPatientPrivacySettings: server.privacy,
  getPatientStorage: server.storage,
  getPatientSecuritySettings: server.security,
  getPatientSessions: server.sessions,
}));
vi.mock("@/lib/api/addresses-server", () => ({ getPatientAddresses: server.addresses }));

import SettingsHubPage from "@/app/[locale]/settings/page";
import SettingsAboutPage from "@/app/[locale]/settings/about/page";
import SettingsPrivacyPage from "@/app/[locale]/settings/privacy/page";
import SettingsSecurityPage from "@/app/[locale]/settings/security/page";
import SettingsHelpPage from "@/app/[locale]/settings/help/page";
import AddressesPage from "@/app/[locale]/profile/addresses/page";
import SettingsDataRedirect from "@/app/[locale]/settings/data/page";
import SettingsFeedbackRedirect from "@/app/[locale]/settings/feedback/page";
import NotificationsSettingsRedirect from "@/app/[locale]/notifications/settings/page";
import SupportRedirect from "@/app/[locale]/support/page";
import AddressSelectRedirect from "@/app/[locale]/delivery/address-select/page";
import ProfileEditRedirect from "@/app/[locale]/profile/edit/page";
import { SessionList } from "@/components-next/settings/session-list";
import { returnStatus } from "@/components-next/returns/return-kit";
import { parseOwnSessions } from "@/lib/api/settings";

const render = (node: ReactNode) => renderToStaticMarkup(node).replace(/ /g, " ");
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const params = Promise.resolve({ locale: "en" });
const search = (query: Record<string, string> = {}) => Promise.resolve(query);
const redirectTarget = async (run: () => Promise<unknown>) => {
  try { await run(); } catch (error) { return (error as Error).message; }
  return "no redirect";
};

beforeEach(() => { Object.values(server).forEach((fn) => fn.mockReset()); });

describe("settings hub", () => {
  it("shows the account summary and one row per section, and reads only the profile", async () => {
    server.api.mockResolvedValue(json({ fullName: "Sara Test", email: "sara@example.com" }));
    const html = render(await SettingsHubPage({ params }));
    expect(html).toContain("Sara Test");
    for (const path of ["notifications", "privacy", "security", "language", "help", "about"]) expect(html).toContain(`href="/en/settings/${path}"`);
    expect(server.api).toHaveBeenCalledTimes(1);
    expect(server.api.mock.calls[0][0]).toBe("/users/me/profile");
    expect(html).not.toContain("style=");
  });

  it("a failed profile read is an error with a retry, an expired session goes to sign-in", async () => {
    server.api.mockResolvedValue(new Response("{}", { status: 500 }));
    expect(render(await SettingsHubPage({ params }))).toContain("This page could not be loaded");
    server.api.mockResolvedValue(new Response("{}", { status: 401 }));
    expect(await redirectTarget(() => SettingsHubPage({ params }))).toBe("redirect:/en/login");
  });
});

describe("about and legal", () => {
  it("writes the cancellation and refund rules from the server's numbers only (decision 26)", async () => {
    server.api.mockResolvedValue(json({ cancellation_policy: { full_hours: 6, late_fee_percent: 15 }, returns_policy: { wallet_refund_days_min: 2, wallet_refund_days_max: 5, unused_days: 9 } }));
    const html = render(await SettingsAboutPage({ params }));
    expect(html).toContain("up to 6 hours before");
    expect(html).toContain("costs 15% of the booking");
    expect(html).toContain("within 2 to 5 business days");
    expect(html).toContain("within 9 days of receipt");
    expect(html).toContain('href="/en/terms"');
    expect(html).toContain('href="/en/privacy"');
  });

  it("writes no number the server did not send, and says so when the policy could not be loaded", async () => {
    server.api.mockResolvedValue(json({ cancellation_policy: { full_hours: 12 } }));
    const partial = render(await SettingsAboutPage({ params }));
    expect(partial).toContain("up to 12 hours before");
    expect(partial).not.toContain("business days");
    expect(partial).not.toContain("costs");
    server.api.mockResolvedValue(new Response("{}", { status: 503 }));
    const failed = render(await SettingsAboutPage({ params }));
    expect(failed).toContain("could not be loaded right now");
    expect(failed).not.toMatch(/\d+ hours/);
  });
});

describe("privacy and my data", () => {
  it("is three tabs in the URL; the default is the five privacy switches", async () => {
    server.privacy.mockResolvedValue(json({ shareData: true }));
    const html = render(await SettingsPrivacyPage({ params, searchParams: search() }));
    expect(html).toContain('href="/en/settings/privacy?tab=data"');
    expect(html).toContain('href="/en/settings/privacy?tab=delete"');
    expect((html.match(/role="switch"/g) || []).length).toBe(5);
    expect(html).toMatch(/aria-checked="true" aria-label="Health data sharing"/);
    expect(server.storage).not.toHaveBeenCalled();
  });

  it("?tab=data reads the storage summary and offers the export; ?tab=delete asks for the password and reads nothing", async () => {
    server.storage.mockResolvedValue(json({ used: "1 MB", total: "100 MB", items: [{ label: "Records", val: "1 MB", pct: 1 }] }));
    const data = render(await SettingsPrivacyPage({ params, searchParams: search({ tab: "data" }) }));
    expect(data).toContain("1 MB / 100 MB");
    expect(data).toContain("Export all my data");
    server.storage.mockReset();
    const erase = render(await SettingsPrivacyPage({ params, searchParams: search({ tab: "delete" }) }));
    expect(erase).toContain("Delete my account");
    expect(server.storage).not.toHaveBeenCalled();
    expect(server.privacy).not.toHaveBeenCalled();
  });
});

describe("security and sessions", () => {
  it("shows the settings and each session with its own sign-out; a failed sessions read is said in place", async () => {
    server.security.mockResolvedValue(json({ biometric: true, two_factor: false }));
    server.sessions.mockResolvedValue(json([{ id: "jti-1", device: "Chrome", expires_in_seconds: 172800 }]));
    const html = render(await SettingsSecurityPage({ params }));
    expect(html).toContain("Chrome");
    expect(html).toContain("Expires in 2 days");
    expect(html).toContain("End session");
    server.sessions.mockResolvedValue(new Response("{}", { status: 500 }));
    expect(render(await SettingsSecurityPage({ params }))).toContain("Sessions could not be loaded");
  });

  it("a session without a usable id has no sign-out, and the id is checked before it can reach a URL", () => {
    expect(parseOwnSessions([{ id: "../x", device: "A" }, { id: "ok_1-2", device: "B" }, { device: "C" }]).map((s) => s.id)).toEqual([undefined, "ok_1-2", undefined]);
    expect(render(<SessionList sessions={[{ device: "C" }]} />)).not.toContain("End session");
  });
});

describe("help and support", () => {
  it("the FAQ tab lists the questions from the server and opens the support chat", async () => {
    server.api.mockResolvedValue(json([{ id: "1", question_en: "How do I book?", answer_en: "Pick a doctor." }]));
    const html = render(await SettingsHelpPage({ params, searchParams: search() }));
    expect(html).toContain("How do I book?");
    expect(html).toContain('href="/en/support/chat"');
    expect(server.api.mock.calls[0][0]).toBe("/support/faqs");
  });

  it("the requests tab reads the patient's requests, the feedback tab reads nothing", async () => {
    server.api.mockResolvedValue(json([{ id: "r1", subject: "Late order", status: "OPEN" }]));
    const mine = render(await SettingsHelpPage({ params, searchParams: search({ tab: "requests" }) }));
    expect(mine).toContain("Late order");
    expect(server.api.mock.calls[0][0]).toBe("/support/requests/mine");
    server.api.mockReset();
    const feedback = render(await SettingsHelpPage({ params, searchParams: search({ tab: "feedback" }) }));
    expect(feedback).toContain("Share your feedback");
    expect(server.api).not.toHaveBeenCalled();
  });
});

describe("address book and its pick mode", () => {
  it("lists the saved addresses with a remove on each and the add form", async () => {
    server.addresses.mockResolvedValue(json([{ id: "a1", label: "Home", line1: "12 King Fahd Rd", is_default: true }]));
    const html = render(await AddressesPage({ params, searchParams: search() }));
    expect(html).toContain("Home");
    expect(html).toContain("12 King Fahd Rd");
    expect(html).toContain("Remove");
    expect(html).toContain("Add a new address");
    expect(html).not.toContain("style=");
  });

  it("?select=1 is the delivery address picker that replaced /delivery/address-select", async () => {
    server.addresses.mockResolvedValue(json([{ id: "a1", label: "Home", street: "12 King Fahd Rd", lat: 24.7, lng: 46.7, is_default: true }]));
    // the page hands the async server component back as an element; React resolves it, so the test calls it
    const element = (await AddressesPage({ params, searchParams: search({ select: "1" }) })) as { type: (props: unknown) => Promise<ReactNode>; props: unknown };
    const html = render(await element.type(element.props));
    expect(html).toContain("Use this address");
    expect(html).toContain('name="delivery-address"');
  });
});

describe("merged routes redirect and keep the query", () => {
  const props = (query: Record<string, string> = {}) => ({ params, searchParams: search(query) });
  it("sends every old route to the screen that absorbed it", async () => {
    expect(await redirectTarget(() => SettingsDataRedirect(props()))).toBe("redirect:/en/settings/privacy?tab=data");
    expect(await redirectTarget(() => SettingsFeedbackRedirect(props()))).toBe("redirect:/en/settings/help?tab=feedback");
    expect(await redirectTarget(() => NotificationsSettingsRedirect(props({ ref: "n" })))).toBe("redirect:/en/settings/notifications?ref=n");
    expect(await redirectTarget(() => SupportRedirect(props()))).toBe("redirect:/en/settings/help");
    expect(await redirectTarget(() => AddressSelectRedirect(props({ from: "cart" })))).toBe("redirect:/en/profile/addresses?from=cart&select=1");
    expect(await redirectTarget(() => ProfileEditRedirect(props()))).toBe("redirect:/en/health/profile");
  });
});

describe("return statuses", () => {
  it("knows the four states the backend has and calls any other value in progress", () => {
    expect(["processing", "approved", "completed", "rejected", "APPROVED", "weird", undefined].map(returnStatus)).toEqual(["processing", "approved", "completed", "rejected", "approved", "other", "other"]);
  });
});

describe("Batch 12 styles", () => {
  const files = ["components-next/settings/settings.module.css", "components-next/map-explorer.module.css"];
  it("use tokens and logical properties only", () => {
    for (const file of files) {
      const css = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(css, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(css, file).not.toMatch(/rgba?\(/);
      expect(css, file).not.toMatch(/\b(margin|padding)-(left|right)\b|(^|[\s{;])(left|right)\s*:/);
      expect(css, file).not.toMatch(/font-size:\s*[\d.]+(px|rem)/);
    }
  });
});
