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
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-health-token" }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: server.api }));

import HealthPage from "@/app/[locale]/health/page";
import VitalsPage from "@/app/[locale]/health/vitals/page";
import SleepPage from "@/app/[locale]/health/sleep/page";
import MedicationsPage from "@/app/[locale]/health/medications/page";
import ProfilePage from "@/app/[locale]/health/profile/page";
import RecordsPage from "@/app/[locale]/health/records/page";
import ActionableOrderRedirect from "@/app/[locale]/health/actionable-order/page";
import SmartRemindersRedirect from "@/app/[locale]/health/smart-reminders/page";
import ReportDetailPage from "@/app/[locale]/reports/[reportId]/page";
import PassportPage from "@/app/[locale]/reports/passport/page";
import { FormSheet } from "@/components-next/health/form-sheet";
import { HealthTabs } from "@/components-next/health/health-kit";
import { todayDoses } from "@/lib/health/doses";
import { familyContacts, profileItems } from "@/lib/health/profile";
import { extractReports, extractTimeline } from "@/lib/health/records";
import { isFlag, pickTab } from "@/lib/health/view";

const TOKEN = "server-only-health-token";
const REMINDER = "91047ef2-ad36-422a-a184-629693e7c729";
const render = (node: ReactNode) => renderToStaticMarkup(node);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const params = Promise.resolve({ locale: "en" });
const page = (query: Record<string, string> = {}) => ({ params, searchParams: Promise.resolve(query) });

/** Answers each backend path the health screens read; a path not listed answers 503, like a backend that is down. */
function backend(routes: Record<string, unknown | Response>) {
  server.api.mockImplementation(async (path: string) => {
    const hit = Object.keys(routes).find((key) => path === key || path.startsWith(`${key}?`));
    if (!hit) return json({}, 503);
    const value = routes[hit];
    return value instanceof Response ? value.clone() : json(value);
  });
}

const reminder = { id: REMINDER, medicine_name_en: "Verified medicine", dose: "1 tablet", times: ["08:00", "20:00"], frequency: "daily", patient_id: "private-patient", instructions_ar: "private-instructions", refill_pending_order_id: "private-order" };

beforeEach(() => { server.api.mockReset(); });

describe("the health hub", () => {
  it("draws the latest vitals, the score and today's doses, and nothing the patient did not see before", async () => {
    backend({
      "/health/vitals/summary": [{ key: "heart_rate", value: "72", unit: "bpm", measured_at: "2026-08-20T10:00:00.000Z", patient_id: "private-patient", source: "private-device", notes: "private-note", id: "private-reading" }],
      "/health/score": { score: 81, status: "good", components: [{ key: "sleep", score: 70 }] },
      "/health/reminders": { reminders: [reminder] },
    });
    const html = render(await HealthPage(page()));
    expect(server.api).toHaveBeenCalledWith("/health/vitals/summary", {}, TOKEN);
    expect(html).toContain("72");
    expect(html).toContain("bpm");
    expect(html).toContain("81");
    expect(html).toContain("Verified medicine");
    expect(html).toContain("/en/health/profile");
    expect(html).toContain("/en/reports/passport");
    expect(html).toContain("/en/health/vitals?tab=today&amp;add=1");
    // the four board tiles are always there; heart rate only because there is a reading
    expect(html.match(/Blood pressure|Blood glucose|Weight|Temperature/g)?.length).toBeGreaterThanOrEqual(4);
    for (const secret of [TOKEN, "private-patient", "private-device", "private-note", "private-reading", "private-instructions", "private-order"]) expect(html).not.toContain(secret);
  });

  it("shows the unavailable state when the vitals cannot be read, and says in place when only the score or the doses cannot", async () => {
    backend({});
    expect(render(await HealthPage(page()))).toContain("Couldn&#x27;t load this screen");
    backend({ "/health/vitals/summary": [] });
    const partial = render(await HealthPage(page()));
    expect(partial).toContain("The health score couldn&#x27;t be loaded.");
    expect(partial).toContain("Today&#x27;s doses couldn&#x27;t be loaded.");
  });
});

describe("the health hub: next appointment (issue 678)", () => {
  const APPT = "0a1b2c3d-1111-4222-8333-444455556666";
  it("shows the same upcoming appointment the home page shows, with its link, time and status", async () => {
    backend({ "/health/vitals/summary": [], "/home/upcoming-appointment": { id: APPT, doctor_name: "Dr Test", scheduled_at: "2026-10-12T09:30:00.000Z", status: "confirmed", patient_id: "private-patient" } });
    const html = render(await HealthPage(page()));
    expect(server.api).toHaveBeenCalledWith("/home/upcoming-appointment", {}, TOKEN);
    expect(html).toContain("Dr Test");
    expect(html).toContain("Your next appointment");
    expect(html).toContain(`href="/en/appointments/${APPT}"`);
    expect(html).toContain("2026-10-12T09:30:00.000Z");
    expect(html).not.toContain("private-patient");
  });
  it("shows nothing when there is none, and says so in place when it could not be loaded", async () => {
    backend({ "/health/vitals/summary": [], "/home/upcoming-appointment": json({}, 404) });
    const none = render(await HealthPage(page()));
    expect(none).not.toContain("Your next appointment");
    expect(none).not.toContain("next appointment could not be loaded");
    backend({ "/health/vitals/summary": [] });
    expect(render(await HealthPage(page()))).toContain("next appointment could not be loaded");
  });
});

describe("vitals: three tabs and a sheet", () => {
  it("history lists the saved readings, and ?add=1 opens the add-reading sheet on load", async () => {
    backend({ "/health/vitals": [{ id: "r1", key: "bp", value: "120/80", unit: "mmHg", measured_at: "2026-08-20T10:00:00.000Z" }] });
    const html = render(await VitalsPage(page({ tab: "history", add: "1" })));
    expect(html).toContain("120/80");
    expect(html).toContain('role="dialog"');
    expect(html).toContain("Save reading");
    expect(html).toContain('aria-current="page"');
  });

  it("today reads the summary and trends read the trends; the sheet is closed without the flag", async () => {
    backend({ "/health/vitals/summary": [{ key: "weight", value: "70", unit: "kg" }], "/health/trends": [{ id: "weight", name: "Weight", unit: "kg", current: 70, trendDir: "down", labels: ["a"], data: [{ value: 70, at: "2026-08-20" }] }] });
    const today = render(await VitalsPage(page()));
    expect(today).toContain("70");
    expect(today).not.toContain('role="dialog"');
    const trends = render(await VitalsPage(page({ tab: "trends" })));
    expect(trends).toContain("Moving down");
    expect(trends).toContain("1 reading");
  });

  it("a hand-typed tab falls back to today and a failing backend shows the error state", async () => {
    backend({ "/health/vitals/summary": [] });
    expect(render(await VitalsPage(page({ tab: "nonsense" })))).toContain("No reading yet");
    backend({});
    expect(render(await VitalsPage(page({ tab: "history" })))).toContain("Couldn&#x27;t load this screen");
  });
});

describe("sleep", () => {
  it("leads with the last night, newest first, and lists every night", async () => {
    backend({ "/health/sleep": [{ id: "a", sleep_score: 60, duration_hours: 6, measured_at: "2026-08-18T06:00:00.000Z" }, { id: "b", sleep_score: 88, duration_hours: 8, measured_at: "2026-08-19T06:00:00.000Z" }] });
    const html = render(await SleepPage({ params }));
    expect(html).toContain("Last night");
    expect(html.indexOf("88")).toBeLessThan(html.indexOf("Score 60"));
    expect(html).toContain("8 hours");
  });

  it("has the form to add a night (hours and score), also when there are no readings yet", async () => {
    backend({ "/health/sleep": [{ id: "a", sleep_score: 60, duration_hours: 6, measured_at: "2026-08-18T06:00:00.000Z" }] });
    const filled = render(await SleepPage({ params }));
    expect(filled).toContain("Add sleep");
    expect(filled).toContain("Hours slept");
    expect(filled).toContain("Quality score (0 to 100)");
    backend({ "/health/sleep": [] });
    const empty = render(await SleepPage({ params }));
    expect(empty).toContain("No sleep readings yet.");
    expect(empty).toContain("Hours slept");
  });
});

describe("medications: four tabs and a sheet", () => {
  it("today shows the doses with a taken button, without the patient id, instructions or refill metadata", async () => {
    backend({ "/health/reminders": { reminders: [reminder] } });
    const html = render(await MedicationsPage(page()));
    expect(server.api).toHaveBeenCalledWith("/health/reminders", {}, TOKEN);
    expect(html).toContain("Verified medicine");
    expect(html).toContain("1 tablet");
    expect(html).toContain("08:00");
    expect(html).toContain("Taken");
    for (const secret of [TOKEN, "private-patient", "private-instructions", "private-order"]) expect(html).not.toContain(secret);
  });

  it("all reminders carry an edit link by id, and ?edit=<id> opens the edit sheet filled with the reminder", async () => {
    backend({ "/health/reminders": { reminders: [reminder] } });
    const list = render(await MedicationsPage(page({ tab: "all" })));
    expect(list).toContain(`/en/health/medications?tab=all&amp;edit=${REMINDER}`);
    expect(list).toContain("Delete");
    const edit = render(await MedicationsPage(page({ tab: "all", edit: REMINDER, add: "1" })));
    expect(edit.match(/role="dialog"/g)).toHaveLength(1);
    expect(edit).toContain('value="Verified medicine"');
  });

  it("refills offer a refill for each reminder, chronic reads its own endpoint, and no reminders is an empty state", async () => {
    backend({ "/health/reminders": { reminders: [reminder] }, "/health/chronic-meds": [{ id: REMINDER, name: "Metformin", active: true, needs_refill_soon: true, days_until_refill: 3 }] });
    expect(render(await MedicationsPage(page({ tab: "refills" })))).toContain("Request refill");
    const chronic = render(await MedicationsPage(page({ tab: "chronic" })));
    expect(chronic).toContain("Metformin");
    expect(chronic).toContain("Refill soon");
    backend({ "/health/reminders": { reminders: [] } });
    const empty = render(await MedicationsPage(page()));
    expect(empty).toContain("No doses scheduled for today.");
    expect(empty).not.toContain("Taken");
  });
});

describe("the medical profile", () => {
  it("is one screen with the five sections, and emergency contacts in two lists with the numbers masked", async () => {
    backend({
      "/medical-profile": { data: { blood_type: "O+", height_cm: 170, weight_kg: 65, allergies: [{ id: "1", name: "Penicillin" }], chronic_diseases: [{ id: "2", name: "Asthma" }], surgeries: [], long_term_medications: [] } },
      "/health/chronic-diseases": [{ id: "9", name: "Hypertension", source: "doctor" }],
      "/health/emergency-contacts": [{ id: "c1", name: "Sara", relation: "Sister", phone: "+966501234567", isPrimary: true }],
      "/family/emergency-contacts": [{ user_id: "u1", display_name: "Omar", relation: "Brother", phone: "+966507654321" }],
    });
    const html = render(await ProfilePage({ params }));
    for (const id of ["basics", "conditions", "chronic", "emergency", "healthid"]) expect(html).toContain(`id="${id}"`);
    expect(html).toContain("O+");
    expect(html).toContain("Penicillin");
    expect(html).toContain("Hypertension");
    expect(html).toContain("My contacts");
    expect(html).toContain("My family on Nabd+");
    expect(html).toContain("Sara");
    expect(html).toContain("Omar");
    expect(html).toContain("4567");
    expect(html).not.toContain("+966501234567");
    expect(html).not.toContain("+966507654321");
    expect(html).toContain("/en/reports/passport");
    // my contacts are editable: a Remove button on the contact and the add form (name, mobile number, relationship)
    expect(html).toContain("Remove");
    expect(html).toContain("Mobile number");
    expect(html).toContain("Relationship (optional)");
    expect(html).not.toContain("available yet");
  });

  it("says in place when one section cannot load, and fails as a page only without the profile itself", async () => {
    backend({ "/medical-profile": { data: {} }, "/health/emergency-contacts": [] });
    const html = render(await ProfilePage({ params }));
    expect(html).toContain("This part couldn&#x27;t be loaded.");
    backend({});
    expect(render(await ProfilePage({ params }))).toContain("Couldn&#x27;t load this screen");
  });
});

describe("records: three tabs", () => {
  it("reports open the report, prescriptions open the prescription, and the timeline filters by type", async () => {
    backend({ "/medical-reports/mine": { data: [{ id: "report-0001", title_en: "Blood test", report_type: "lab", issued_at: "2026-08-20T10:00:00.000Z" }] } });
    const reports = render(await RecordsPage(page()));
    expect(reports).toContain("/en/reports/report-0001");
    expect(reports).toContain("Blood test");

    backend({ "/prescriptions/mine": { data: [{ id: REMINDER, status: "APPROVED", items: [{ name: "Amoxicillin" }], created_at: "2026-08-20T10:00:00.000Z" }] } });
    expect(render(await RecordsPage(page({ tab: "prescriptions" })))).toContain(`/en/prescriptions/${REMINDER}`);

    backend({ "/medical-reports/timeline": { data: [{ id: "e1", type: "lab", title: "CBC", date: "2026-08-20T10:00:00.000Z" }, { id: "e2", type: "appointment", title: "Check-up", date: "2026-08-21T10:00:00.000Z" }] } });
    const timeline = render(await RecordsPage(page({ tab: "timeline", type: "lab" })));
    expect(timeline).toContain("CBC");
    expect(timeline).not.toContain("Check-up");
    expect(timeline).toContain("/en/health/records?tab=timeline&amp;type=lab");
  });
});

describe("detail screens and redirects", () => {
  it("a report shows its title and the fields it has, and the health ID shows the share code", async () => {
    backend({ "/medical-reports/report-0001": { title_en: "Blood test", summary: "All normal", diagnosis: "", issued_at: "2026-08-20T10:00:00.000Z" } });
    const report = render(await ReportDetailPage({ params: Promise.resolve({ locale: "en", reportId: "report-0001" }) }));
    expect(report).toContain("Blood test");
    expect(report).toContain("All normal");
    expect(report).not.toContain("report-diagnosis");
    expect(report).toContain('data-back="/en/health/records?tab=reports"');

    backend({ "/medical-profile": { data: { full_name: "Test Patient", blood_type: "A+" } }, "/medical-profile/passport-token": { token: "PASS-1234" } });
    const id = render(await PassportPage({ params }));
    expect(id).toContain("Test Patient");
    expect(id).toContain("PASS-1234");
  });

  it("the removed order screen redirects to the prescriptions tab without carrying the old payload", async () => {
    await expect(ActionableOrderRedirect({ params })).rejects.toThrow("redirect:/en/health/records?tab=prescriptions");
    await expect(SmartRemindersRedirect({ params })).rejects.toThrow("redirect:/en/health/medications?tab=all");
  });

  it("every old route is a redirect to a tab or a section of the new screens", async () => {
    const config = (await import("../next.config")).default;
    const redirects = await (config as unknown as { redirects: () => Promise<Array<{ source: string; destination: string }>> }).redirects();
    const to = (source: string) => redirects.find((entry) => entry.source === `/:locale${source}`)?.destination;
    expect(to("/health/score")).toBe("/:locale/health");
    expect(to("/health/vitals/log")).toBe("/:locale/health/vitals?tab=today&add=1");
    expect(to("/health/trends")).toBe("/:locale/health/vitals?tab=trends");
    expect(to("/health/refills")).toBe("/:locale/health/medications?tab=refills");
    expect(to("/health/chronic-medications")).toBe("/:locale/health/medications?tab=chronic");
    expect(to("/reminders")).toBe("/:locale/health/medications?tab=all");
    expect(to("/health/emergency-contacts")).toBe("/:locale/health/profile#emergency");
    expect(to("/family/emergency-contacts")).toBe("/:locale/health/profile#emergency");
    expect(to("/health/conditions-allergies")).toBe("/:locale/health/profile#conditions");
    expect(to("/health/chronic-diseases")).toBe("/:locale/health/profile#chronic");
    expect(to("/reports")).toBe("/:locale/health/records?tab=reports");
    expect(to("/reports/timeline")).toBe("/:locale/health/records?tab=timeline");
    expect(to("/health/timeline")).toBe("/:locale/health/records?tab=timeline");
    expect(to("/health/reports")).toBe("/:locale/health/records?tab=reports");
  });
});

describe("the shared pieces", () => {
  it("the sheet is a labelled modal dialog when it opens on load, and only a button before", () => {
    const closed = render(<FormSheet title="Add" triggerLabel="Open it" closeLabel="Close" closeHref="/en/x"><p>form</p></FormSheet>);
    expect(closed).toContain("Open it");
    expect(closed).not.toContain('role="dialog"');
    const open = render(<FormSheet title="Add" triggerLabel="Open it" closeLabel="Close" closeHref="/en/x" defaultOpen><p>form</p></FormSheet>);
    expect(open).toContain('role="dialog"');
    expect(open).toContain('aria-modal="true"');
    expect(open).toContain("nabd-modal--sheet");
    expect(open).toContain("form");
    expect(open).toContain('aria-label="Close"');
  });

  it("the tabs are links whose state is the URL, with the chosen one marked", () => {
    const html = render(<HealthTabs label="Tabs" base="/en/health/vitals" active="history" options={[{ value: "today", label: "Today" }, { value: "history", label: "History" }]} />);
    expect(html).toContain('href="/en/health/vitals?tab=today"');
    expect(html).toMatch(/aria-current="page"[^>]*>History|href="[^"]*history"[^>]*aria-current="page"/);
  });

  it("the helpers: tab and flag from the URL, today's doses, the profile lists and the record shapes", () => {
    expect(pickTab("x", ["a", "b"] as const, "a")).toBe("a");
    expect(pickTab(["b"], ["a", "b"] as const, "a")).toBe("b");
    expect(isFlag("1")).toBe(true);
    expect(isFlag("0")).toBe(false);
    const doses = todayDoses([{ id: "1", medicineName: "A", times: ["20:00", "08:00"], todayDoses: [], dose: undefined, frequency: undefined }]);
    expect(doses.map((dose) => `${dose.timeKey}:${dose.status}`)).toEqual(["08:00:pending", "20:00:pending"]);
    expect(profileItems([{ id: "1", name: "A" }, { name: "no id" }, { id: "3" }])).toEqual([{ id: "1", name: "A" }]);
    expect(familyContacts({ data: [{ user_id: "u", display_name: "Omar", phone: "+966507654321" }, { phone: "x" }] })).toEqual([{ id: "u", name: "Omar", relation: undefined, maskedPhone: "•••••••••4321" }]);
    expect(extractReports([{ id: "r", title_ar: "عنوان", title_en: "Title" }], "en")[0].title).toBe("Title");
    expect(extractReports([{ id: "r", title_ar: "عنوان", title_en: "Title" }], "ar")[0].title).toBe("عنوان");
    expect(extractTimeline({ events: [{ id: "e", kind: "lab", created_at: "2026-08-20" }] })[0]).toMatchObject({ type: "lab", date: "2026-08-20" });
  });

  it("the health styles use tokens only: no colour written in them, and focus and logical properties where they are pressed", () => {
    const css = readFileSync(resolve(process.cwd(), "components-next/health/health.module.css"), "utf8");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\brgba?\(/);
    expect(css).not.toMatch(/\b(left|right|margin-left|margin-right|padding-left|padding-right)\s*:/);
    expect(css).toContain("a.tile:focus-visible");
    expect(css).toContain(".iconButton:focus-visible");
  });
});
