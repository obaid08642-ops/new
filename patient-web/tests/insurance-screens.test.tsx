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
// issue 1550: the hubs read the session without requiring it (a guest gets the public part)
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-insurance-token-never-in-html", getOptionalPatientAccessToken: async () => "server-only-insurance-token-never-in-html" }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: server.api }));

import InsurancePage from "@/app/[locale]/insurance/page";
import InsuranceRequestPage from "@/app/[locale]/insurance/requests/[requestId]/page";
import InsuranceCoverageCheckPage from "@/app/[locale]/insurance/coverage-check/page";
import ApprovalPendingRedirect from "@/app/[locale]/insurance/approval-pending/page";
import CopayRedirect from "@/app/[locale]/insurance/copay/page";
import PaymentSplitRedirect from "@/app/[locale]/insurance/payment-split/page";
import PolicyDetailRedirect from "@/app/[locale]/insurance/policy-detail/page";
import NetworkRedirect from "@/app/[locale]/insurance/network-providers/page";
import ClaimsRedirect from "@/app/[locale]/insurance/claims/page";
import RefundsRedirect from "@/app/[locale]/insurance/refunds/page";
import SubmitClaimRedirect from "@/app/[locale]/insurance/submit-claim/page";
import { TABS, parseBenefits, parseCoverage, parseRequestRows, requestTone } from "@/lib/insurance/view";

const TOKEN = "server-only-insurance-token-never-in-html";
const ID = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";
const render = (node: ReactNode) => renderToStaticMarkup(node);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const params = Promise.resolve({ locale: "en" });
const hub = (query: Record<string, string> = {}) => ({ params, searchParams: Promise.resolve(query) });
const redirectTarget = async (run: () => Promise<unknown>) => {
  try { await run(); } catch (error) { return (error as Error).message; }
  return "no redirect";
};

/** Answers each backend path the insurance screens read; a path not listed answers 503, like a backend that is down. */
function backend(routes: Record<string, unknown | Response>) {
  server.api.mockImplementation(async (path: string) => {
    const hit = Object.keys(routes).find((key) => path === key);
    if (!hit) return json({}, 503);
    const value = routes[hit];
    return value instanceof Response ? value.clone() : json(value);
  });
}

const policy = { has_policy: true, policy: { company_name: "Bupa Arabia", plan_class: "VIP", policy_number: "POL-123", member_name: "Test Member", national_id: "1000000000", network: "Network A", verified: false } };
const requests = { data: [
  { id: ID, state: "COPAY_PENDING", booking_kind: "lab", price: 80, created_at: "2026-10-01T10:00:00.000Z", copay_amount: 12.5 },
  { id: ID2, state: "PENDING_PROVIDER_REVIEW", created_at: "2026-10-03T10:00:00.000Z" },
] };

beforeEach(() => server.api.mockReset());

describe("the insurance hub", () => {
  it("shows the policy card, the shortcuts, the three tabs and the requests newest first, each linking to its request page", async () => {
    backend({ "/insurance/my-policy": policy, "/insurance/requests/my": requests });
    const html = render(await InsurancePage(hub()));
    expect(html).toContain("Bupa Arabia");
    expect(html).toContain("Class VIP");
    // the badge follows the verified flag (not yet verified: in review), and the card carries the details rows
    expect(html).toContain("In review");
    for (const detail of ["POL-123", "Test Member", "1000000000", "Network A"]) expect(html).toContain(detail);
    // a request row is titled by its booking kind and shows the price
    expect(html).toContain("Lab tests");
    expect(html).toMatch(/SAR\s80\.00/);
    // the decision-35 note shows under every tab
    expect(render(await InsurancePage(hub({ tab: "benefits" })))).toContain("Nabd+ does not contact your insurer");
    for (const label of ["Policy", "Benefits", "Network"]) expect(html).toContain(`>${label}</a>`);
    for (const label of ["Claims", "Refunds"]) expect(html).not.toContain(`>${label}</a>`);
    expect(html).not.toMatch(/submit-claim|submit a claim|Submit claim/i);
    for (const href of ["/en/insurance/add-policy", "/en/insurance?tab=network", "/en/insurance/coverage-check"]) expect(html).toContain(`href="${href}"`);
    expect(html.indexOf(`/en/insurance/requests/${ID2}`)).toBeGreaterThan(-1);
    expect(html.indexOf(`/en/insurance/requests/${ID2}`)).toBeLessThan(html.indexOf(`/en/insurance/requests/${ID}`));
    expect(html).toContain("Approved in part");
    expect(html).toContain("Awaiting review");
    expect(html).not.toContain(TOKEN);
  });

  it("says in place that the policy cannot load, with a retry, and 404 is not found", async () => {
    backend({});
    expect(render(await InsurancePage(hub()))).toContain("Unable to load insurance");
    server.api.mockImplementation(async () => json({}, 404));
    await expect(InsurancePage(hub())).rejects.toThrow("not-found");
    server.api.mockImplementation(async () => json({}, 401));
    await expect(InsurancePage(hub())).rejects.toThrow("redirect:/en/login");
  });

  it("keeps the page when only one tab cannot load", async () => {
    backend({ "/insurance/my-policy": policy });
    const html = render(await InsurancePage(hub({ tab: "benefits" })));
    expect(html).toContain("Bupa Arabia");
    expect(html).toContain("This part could not load right now");
  });

  it("shows the benefits note translated from its code (never the Arabic server sentence), and an old ?tab=claims or ?tab=refunds link shows the policy tab without reading claims or refunds", async () => {
    backend({ "/insurance/my-policy": policy, "/insurance/benefits-summary": { has_policy: true, policy: {}, benefits: [{ key: "manual_review", note_code: "coverage_decided_by_provider", note_ar: "تخضع الموافقة لمراجعة مزود الخدمة" }] } });
    const benefits = render(await InsurancePage(hub({ tab: "benefits" })));
    expect(benefits).toContain("The provider decides the final coverage when it reviews your request.");
    expect(benefits).not.toContain("تخضع الموافقة لمراجعة مزود الخدمة");
    backend({ "/insurance/my-policy": policy, "/insurance/requests/my": requests });
    for (const tab of ["claims", "refunds"]) {
      const html = render(await InsurancePage(hub({ tab })));
      expect(html).toContain("Bupa Arabia");
      expect(html).toContain("Awaiting review");
    }
    const paths = server.api.mock.calls.map((call) => String(call[0]));
    expect(paths.some((path) => path.includes("claims") || path.includes("refunds"))).toBe(false);
  });

  it("network: without a saved insurer it asks for a policy; with one it reads that insurer's providers and the search keeps the tab", async () => {
    backend({ "/insurance/my-policy": policy, "/users/me/profile": {} });
    const none = render(await InsurancePage(hub({ tab: "network" })));
    expect(none).toContain("No saved policy");
    expect(none).toContain("/en/insurance/add-policy");
    backend({ "/insurance/my-policy": policy, "/users/me/profile": { insurance: { company_id: "c9" } }, "/providers?insurance_company=c9": [{ id: "p1", name_en: "Nur Clinic", type: "clinic", city: "Riyadh", specialties: ["A", "B", "C", "D"], phone: "+966500000000" }] });
    const html = render(await InsurancePage(hub({ tab: "network" })));
    expect(html).toContain("Nur Clinic");
    // type chips, the city, up to three specialties and the call button, as the app's network tab
    for (const chip of ["All", "Doctors", "Hospitals", "Pharmacies", "Labs"]) expect(html).toContain(`>${chip}</button>`);
    expect(html).toContain("Clinic · A · B · C · Riyadh");
    expect(html).not.toContain("A · B · C · D");
    expect(html).toContain('href="tel:+966500000000"');
  });
});

describe("the page of one insurance request", () => {
  const page = (requestId: string) => ({ params: Promise.resolve({ locale: "en", requestId }) });
  const open = async (record: Record<string, unknown>) => {
    backend({ [`/insurance/requests/${ID}`]: { data: { id: ID, ...record } } });
    return render(await InsuranceRequestPage(page(ID)));
  };

  it("pending review: waits, polls by itself, shows no payment button", async () => {
    const html = await open({ state: "PENDING_PROVIDER_REVIEW" });
    expect(html).toContain("Approval requested");
    expect(html).toContain("The facility is requesting the approval from your insurer");
    expect(html).toContain("Nothing is charged before it");
    expect(html).toContain("This page refreshes by itself");
    expect(html.toLowerCase()).not.toMatch(/checking coverage|nphies|instant|live check/);
    expect(html).not.toContain("View secure payment options");
  });

  it("co-pay: the server's amount and the way to the secure payment options, never a cash option", async () => {
    const html = await open({ state: "COPAY_PENDING", copay_amount: 12.5, price: 80 });
    expect(html).toContain("Approved in part: pay your co-pay");
    expect(html).toContain("SAR");
    expect(html).toContain("12.50");
    expect(html).toContain("80.00");
    expect(html).toMatch(/Go to secure payment — SAR\s12\.50/);
    expect(html.toLowerCase()).not.toContain("cash");
    expect(html).toContain('data-back="/en/insurance"');
  });

  it("declined: the server's reason and the self-pay acceptance", async () => {
    const html = await open({ state: "REJECTED", rejection_reason: "Not covered by plan" });
    expect(html).toContain("Not covered by plan");
    expect(html).toContain("Accept self-pay");
  });

  it("covered in full: no payment, a way to the booking when the server names one", async () => {
    const html = await open({ state: "APPROVED_FULL", booking_id: ID2 });
    expect(html).toContain("Approved in full");
    expect(html).toContain(`/en/consultations/booking-status?appointmentId=${ID2}`);
    expect(html).not.toContain("View secure payment options");
  });

  it("shows the provider's record: the approval number and the co-pay percent next to the amount", async () => {
    const html = await open({ state: "COPAY_PENDING", copay_amount: 16, price: 80, approval_code: "TEST-AP-4471", copay_percent: 20 });
    expect(html).toContain("Approval number");
    expect(html).toContain("TEST-AP-4471");
    expect(html).toContain("Co-pay percent");
    expect(html).toContain("20%");
    expect(html).toContain("16.00");
    expect(html).toContain("Approved in part");
  });

  it("draws no approval number and no percent row when the provider did not send them", async () => {
    const html = await open({ state: "COPAY_PENDING", copay_amount: 16, price: 80, approval_code: null });
    expect(html).not.toContain("Approval number");
    expect(html).not.toContain("Co-pay percent");
    expect(html).toContain("16.00");
  });

  it("self-pay due shows the options button; an unknown state or a bad id is not a page", async () => {
    expect(await open({ state: "SELF_PAY_PENDING", self_pay_amount: 30 })).toMatch(/Go to secure payment — SAR\s30\.00/);
    expect(await open({ state: "WHATEVER" })).toContain("Unable to load insurance");
    await expect(InsuranceRequestPage(page("nope"))).rejects.toThrow("not-found");
  });
});

describe("parity with the app (benefits usage, request not found, coverage details)", () => {
  it("benefits: the usage figures are the server's (requests, insurer covered, you paid, expiry)", async () => {
    backend({ "/insurance/my-policy": policy, "/insurance/benefits-summary": { has_policy: true, policy: {}, benefits: [], usage: { requests: 3, insurer_covered: 200, patient_share: 40 }, expiry_date: "2027-01-01" } });
    const html = render(await InsurancePage(hub({ tab: "benefits" })));
    expect(html).toContain("Insurance requests: 3");
    expect(html).toMatch(/SAR\s200\.00/);
    expect(html).toMatch(/SAR\s40\.00/);
    expect(html).toContain("Covered by insurer");
    expect(html).toContain("You paid");
  });

  it("a request that is not the patient's is an in-page state with the way back, not a 404 page", async () => {
    backend({ [`/insurance/requests/${ID}`]: json({}, 404) });
    const html = render(await InsuranceRequestPage({ params: Promise.resolve({ locale: "en", requestId: ID }) }));
    expect(html).toContain("No insurance request");
    expect(html).toContain("Go back");
  });

  it("the request page shows the insurer and the policy number under the amounts", async () => {
    backend({ "/insurance/my-policy": policy, [`/insurance/requests/${ID}`]: { data: { id: ID, state: "APPROVED_FULL" } } });
    const html = render(await InsuranceRequestPage({ params: Promise.resolve({ locale: "en", requestId: ID }) }));
    expect(html).toContain("Bupa Arabia");
    expect(html).toContain("POL-123");
  });

  it("coverage: the optional provider field, the copay and the cap, the pre-authorisation flag with the support link, and check again", async () => {
    backend({ "/insurance/coverage-check?service_type=labs&service_key=Nur": { covered: true, eligible: true, service_type: "labs", copay_percent: 20, copay_flat: 50, requires_preauth: true, provider_name: "Nur Clinic" } });
    const html = render(await InsuranceCoverageCheckPage({ params, searchParams: Promise.resolve({ service_type: "labs", service_key: "Nur" }) }));
    expect(html).toContain('name="service_key"');
    expect(html).toMatch(/20\s?%/);
    expect(html).toMatch(/SAR\s50\.00/);
    expect(html).toContain("Nur Clinic");
    expect(html).toContain('href="/en/support/chat"');
    expect(html).toContain('href="/en/insurance/coverage-check"');
  });
});

describe("the coverage check", () => {
  const run = async (query: Record<string, string>) => render(await InsuranceCoverageCheckPage({ params, searchParams: Promise.resolve(query) }));

  it("asks for a service and shows the server's answer as it came", async () => {
    backend({});
    const first = await run({});
    expect(first).toContain("What my policy covers");
    expect(first).toContain("Based on the policy details saved on your account");
    expect(first).toContain("not a check with your insurer");
    backend({ "/insurance/coverage-check?service_type=lab": { eligible: true, policy: {}, service_type: "lab", note_code: "coverage_decided_by_provider", note_ar: "التغطية النهائية يحددها مزود الخدمة" } });
    const html = await run({ service_type: "lab" });
    expect(html).toContain("Listed as covered on your saved policy");
    expect(html).toContain("The provider decides the final coverage when it reviews your request.");
    expect(html).not.toContain("التغطية النهائية يحددها مزود الخدمة");
  });
});

describe("old routes (merge map 2, section 6)", () => {
  it("tab pages redirect to the hub keeping the query", async () => {
    expect(await redirectTarget(async () => PolicyDetailRedirect(hub()))).toBe("redirect:/en/insurance?tab=policy");
    expect(await redirectTarget(async () => NetworkRedirect(hub({ q: "nur", type: "lab" })))).toBe("redirect:/en/insurance?tab=network&q=nur&type=lab");
  });

  it("the removed claims, refunds and submit-claim pages open the hub (owner decision 35)", async () => {
    expect([...TABS]).toEqual(["policy", "benefits", "network"]);
    expect(await redirectTarget(async () => ClaimsRedirect({ params }))).toBe("redirect:/en/insurance");
    expect(await redirectTarget(async () => RefundsRedirect({ params }))).toBe("redirect:/en/insurance");
    expect(await redirectTarget(async () => SubmitClaimRedirect({ params }))).toBe("redirect:/en/insurance");
  });

  it("approval-pending, payment-split and co-pay open the one request page", async () => {
    const approval = (query: Record<string, string>) => ApprovalPendingRedirect({ params, searchParams: Promise.resolve(query) });
    expect(await redirectTarget(async () => approval({ requestId: ID }))).toBe(`redirect:/en/insurance/requests/${ID}`);
    backend({ "/insurance/requests/my": { data: [{ id: ID, state: "PENDING_PROVIDER_REVIEW", booking_id: ID2, created_at: "2026-10-01T00:00:00Z" }, { id: ID2, state: "APPROVED_FULL", created_at: "2026-10-05T00:00:00Z" }] } });
    expect(await redirectTarget(async () => approval({ bookingId: ID2 }))).toBe(`redirect:/en/insurance/requests/${ID}`);
    expect(await redirectTarget(async () => PaymentSplitRedirect({ params, searchParams: Promise.resolve({ request_id: ID2 }) }))).toBe(`redirect:/en/insurance/requests/${ID2}`);
    await expect(PaymentSplitRedirect({ params, searchParams: Promise.resolve({ request_id: "x" }) })).rejects.toThrow("not-found");
    backend({ "/insurance/requests/my": requests });
    expect(await redirectTarget(async () => CopayRedirect({ params }))).toBe(`redirect:/en/insurance/requests/${ID}`);
    backend({ "/insurance/requests/my": { data: [] } });
    expect(await redirectTarget(async () => CopayRedirect({ params }))).toBe("redirect:/en/insurance");
  });
});

describe("what the screens read", () => {
  it("parses only what the server sent", () => {
    expect(parseRequestRows({ data: [{ id: "not-a-uuid", state: "X" }, { id: ID, state: "REJECTED" }] }).map((row) => row.id)).toEqual([ID]);
    expect(parseBenefits({ benefits: [{ key: "k" }] })).toEqual([{ key: "k", noteCode: undefined }]);
    expect(parseBenefits({ benefits: [{ key: "k", note_code: "no_policy_on_file" }] })).toEqual([{ key: "k", noteCode: "no_policy_on_file" }]);
    expect(parseBenefits({})).toBeNull();
    expect(parseCoverage({ eligible: false })).toEqual({ eligible: false, serviceType: undefined, noteCode: undefined, copayPercent: undefined, copayFlat: undefined, requiresPreauth: false, reason: undefined, sub: undefined });
    expect(parseCoverage({ eligible: "yes" })).toBeNull();
    expect(requestTone("REJECTED")).toBe("bad");
  });

  it("the insurance styles use tokens only (no raw colour, no physical left/right)", () => {
    const css = readFileSync(resolve(process.cwd(), "components-next/insurance/insurance.module.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    expect(css).not.toMatch(/\b(margin|padding)-(left|right)\b|\b(left|right):/);
    expect(css).toContain("repeat(3, minmax(0, 1fr))");
  });
});
