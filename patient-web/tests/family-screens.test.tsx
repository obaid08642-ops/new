import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({ api: vi.fn() }));

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
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-family-token-never-in-html" }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: server.api }));

import FamilyPage from "@/app/[locale]/family/page";
import FamilyMemberPage from "@/app/[locale]/family/[memberRef]/page";
import FamilyCalendarPage from "@/app/[locale]/family/calendar/page";
import FamilyAddPage from "@/app/[locale]/family/add/page";
import { familyMemberRef } from "@/lib/api/family-member-ref";
import { knownPermissions, parseCalendarEvents, parseGroupPermissions, parseMemberRecords, parsePermissionRequests } from "@/lib/family/view";

const TOKEN = "server-only-family-token-never-in-html";
const MEMBER = "private_member_123";
const render = (node: ReactNode) => renderToStaticMarkup(node);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const params = Promise.resolve({ locale: "en" });
const page = (query: Record<string, string> = {}) => ({ params, searchParams: Promise.resolve(query) });

/** Answers each backend path the family screens read; a path not listed answers 503, like a backend that is down. */
function backend(routes: Record<string, unknown | Response>) {
  server.api.mockImplementation(async (path: string) => {
    const hit = Object.keys(routes).find((key) => path === key);
    if (!hit) return json({}, 503);
    const value = routes[hit];
    return value instanceof Response ? value.clone() : json(value);
  });
}

const members = { members: [{ user_id: MEMBER, role: "owner", display_name: "Sara Ali", relation: "Mother", joined_at: "2026-08-20T10:00:00.000Z" }] };
const group = { data: { name: "Ali family", owner_id: MEMBER, members: [{ user_id: MEMBER, permissions: ["vitals", "meds", "view_health"] }] } };
const pending = [{ id: "req-1", member_name: "Omar Ali", permissions: ["reports", "unknown_grant"] }];

beforeEach(() => { server.api.mockReset(); });

describe("the family hub", () => {
  it("draws the members with their badge, the add and join buttons, the requests and the rows, and nothing private", async () => {
    backend({ "/family/members": members, "/family/my-group": group, "/family/permissions/pending": pending });
    const html = render(await FamilyPage({ params }));
    expect(server.api).toHaveBeenCalledWith("/family/members", {}, TOKEN);
    expect(html).toContain("Sara Ali");
    expect(html).toContain("Ali family");
    expect(html).toContain("Access 2/4");
    expect(html).toContain(`/en/family/${familyMemberRef(MEMBER)}`);
    expect(html).toContain("/en/family/add?tab=invite");
    expect(html).toContain("/en/family/add?tab=join");
    expect(html).toContain("Omar Ali");
    expect(html).toContain("View reports");
    expect(html).toContain("Approve");
    expect(html).toContain("/en/family/calendar");
    expect(html).toContain("/en/family/chat");
    expect(html).toContain("/en/health/profile#emergency");
    // the old permission screens' key names, the account id and the token never reach the markup; no call entry
    for (const secret of [TOKEN, MEMBER, "view_health", "unknown_grant"]) expect(html).not.toContain(secret);
    expect(html.toLowerCase()).not.toContain("call");
  });

  it("says in place when the requests cannot be read, and offers to create a group when there is none", async () => {
    backend({ "/family/members": members, "/family/my-group": group });
    expect(render(await FamilyPage({ params }))).toContain("Pending requests couldn&#x27;t be loaded.");
    backend({ "/family/members": json({}, 404), "/family/my-group": json({}, 404) });
    const html = render(await FamilyPage({ params }));
    expect(html).toContain("Create a family group");
    expect(html).toContain("Create group");
    backend({});
    expect(render(await FamilyPage({ params }))).toContain("Unable to load family");
  });
});

describe("the family member", () => {
  const ref = familyMemberRef(MEMBER);
  const props = (query: Record<string, string> = {}) => ({ params: Promise.resolve({ locale: "en", memberRef: ref }), searchParams: Promise.resolve(query) });

  it("draws the member's records on the records tab and the account id nowhere", async () => {
    backend({
      "/family/members": members,
      [`/family/member-records/${MEMBER}`]: { profile: { gender: "female", birth_date: "1990-05-01", blood_type: "A+" }, meds: [{ id: "m1", medicine_name_en: "Verified medicine", dose: "1 tablet" }], appointments: [{ id: "a1", doctor_name: "Dr Noor", scheduled_at: "2026-09-01T10:00:00.000Z" }], reports: [{ id: "r1" }] },
    });
    const html = render(await FamilyMemberPage(props()));
    expect(html).toContain("Female");
    expect(html).toContain("A+");
    expect(html).toContain("Verified medicine");
    expect(html).toContain("Dr Noor");
    expect(html).toContain("Medical reports are available");
    expect(html).toContain(`/en/family/${ref}?tab=permissions`);
    expect(html).not.toContain(MEMBER);
  });

  it("draws the member's grants and the remove action on the permissions tab, from the group", async () => {
    backend({ "/family/members": members, "/family/my-group": group });
    const html = render(await FamilyMemberPage(props({ tab: "permissions" })));
    expect(html).toContain("View vitals");
    expect(html).toContain("Remove from family");
    expect(html).toContain("Save");
    backend({ "/family/members": members });
    expect(render(await FamilyMemberPage(props({ tab: "permissions" })))).toContain("The permissions couldn&#x27;t be loaded.");
  });

  it("is not found for an unknown reference", async () => {
    backend({ "/family/members": members });
    await expect(FamilyMemberPage({ params: Promise.resolve({ locale: "en", memberRef: "0".repeat(32) }), searchParams: Promise.resolve({}) })).rejects.toThrow("not-found");
  });
});

describe("the family calendar", () => {
  it("lists the events, treats no group as an empty calendar and a failed read as an error", async () => {
    backend({ "/family/calendar": [{ id: "e1", title: "Vaccination", member_name: "Omar Ali", event_date: "2026-09-01T10:00:00.000Z" }] });
    const html = render(await FamilyCalendarPage({ params }));
    expect(html).toContain("Vaccination");
    expect(html).toContain("Omar Ali");
    backend({ "/family/calendar": json({}, 404) });
    expect(render(await FamilyCalendarPage({ params }))).toContain("No scheduled events");
    backend({});
    expect(render(await FamilyCalendarPage({ params }))).toContain("Unable to load family");
  });
});

describe("add or join", () => {
  it("is one screen with the tabs Invite, Join with code and Scan QR, the tab in the URL and the code kept", async () => {
    const invite = render(await FamilyAddPage(page()));
    expect(invite).toContain("Create invite code");
    expect(invite).toContain("/en/family/add?tab=join");
    expect(invite).toContain("/en/family/add?tab=scan");
    const join = render(await FamilyAddPage(page({ tab: "join", code: "ABC123" })));
    expect(join).toContain("ABC123");
    expect(join).toContain("Join family");
    expect(render(await FamilyAddPage(page({ tab: "scan" })))).toContain("Invite code or link");
  });
});

describe("the old routes and the readers", () => {
  it("every old family route is a redirect to the merged screen", async () => {
    const config = (await import("../next.config")).default;
    const redirects = await (config as unknown as { redirects: () => Promise<Array<{ source: string; destination: string }>> }).redirects();
    const to = (source: string) => redirects.find((entry) => entry.source === `/:locale${source}`)?.destination;
    expect(to("/family/permissions")).toBe("/:locale/family");
    expect(to("/family/permission-requests")).toBe("/:locale/family#requests");
    expect(to("/family/invite")).toBe("/:locale/family/add?tab=invite");
    expect(to("/family/join")).toBe("/:locale/family/add?tab=join");
    expect(to("/family/scan")).toBe("/:locale/family/add?tab=scan");
    expect(to("/health/add-family-member")).toBe("/:locale/family/add?tab=invite");
  });

  it("the readers keep what the server holds and drop what they cannot name", () => {
    expect(parseGroupPermissions(group).get(MEMBER)).toEqual(["vitals", "meds", "view_health"]);
    expect(knownPermissions(["vitals", "view_health"])).toEqual(["vitals"]);
    expect(parsePermissionRequests(pending)).toEqual([{ id: "req-1", name: "Omar Ali", permissions: ["reports"] }]);
    expect(parsePermissionRequests({ data: [{ member_name: "no id" }] })).toEqual([]);
    expect(parseCalendarEvents({ events: [{ id: "e1", title: "T", event_date: "2026-09-01" }] })).toEqual([{ id: "e1", title: "T", member: undefined, at: "2026-09-01" }]);
    expect(parseMemberRecords(null)).toEqual({ gender: undefined, birthDate: undefined, bloodType: undefined, medicines: [], appointments: [], hasReports: false });
  });

  it("the family screens carry no raw colour, inline style or call entry", () => {
    const css = readFileSync(resolve(process.cwd(), "components-next/family/family.module.css"), "utf8");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(css).toContain("prefers-reduced-motion: reduce");
    for (const file of ["add-family.tsx", "create-family.tsx", "family-chat.tsx", "member-permissions.tsx", "permission-requests.tsx"]) {
      const source = readFileSync(resolve(process.cwd(), "components-next/family", file), "utf8");
      expect(source).not.toMatch(/style=\{/);
      expect(source.toLowerCase()).not.toContain("video");
    }
  });
});
