import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-care-token" }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: server.api }));
vi.mock("@/lib/api/mood-server", () => ({ getPatientMoodHistory: (token: string) => server.api("/mental-health/mood?days=30", {}, token) }));
vi.mock("@/lib/api/breathing-server", () => ({ getPatientBreathingHistory: (token: string) => server.api("/mental-health/breathing", {}, token) }));
vi.mock("@/lib/api/meditation-server", () => ({ getPatientMeditationHistory: (token: string) => server.api("/mental-health/meditation", {}, token) }));

import MaternityPage from "@/app/[locale]/maternity/page";
import MaternitySetupPage from "@/app/[locale]/maternity/maternity-setup/page";
import TrackerRedirect from "@/app/[locale]/maternity/tracker/page";
import BabyGrowthRedirect from "@/app/[locale]/maternity/baby-growth/page";
import NutritionPage from "@/app/[locale]/nutrition/page";
import LogMealPage from "@/app/[locale]/nutrition/log-meal/page";
import BodyTargetRedirect from "@/app/[locale]/nutrition/body-target/page";
import PlanRedirect from "@/app/[locale]/nutrition/plan/page";
import MentalHealthPage from "@/app/[locale]/mental-health/page";
import MoodPage from "@/app/[locale]/mental-health/mood/page";
import RelaxPage from "@/app/[locale]/mental-health/relax/page";
import BreathingRedirect from "@/app/[locale]/mental-health/breathing/page";
import CrisisRedirect from "@/app/[locale]/mental-health/crisis-contacts/page";
import SelfAssessmentRedirect from "@/app/[locale]/mental-health/self-assessment/page";
import TherapistRedirect from "@/app/[locale]/mental-health/therapist-match/page";
import ProgramsPage from "@/app/[locale]/programs/page";
import ProgramsActiveRedirect from "@/app/[locale]/programs/active/page";
import { CareHero, RecordRow } from "@/components-next/care/care-kit";
import { ChoiceGroup, TextField } from "@/components-next/care/care-fields";

const TOKEN = "server-only-care-token";
const render = (node: ReactNode) => renderToStaticMarkup(node);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const params = Promise.resolve({ locale: "en" });
const page = (query: Record<string, string> = {}) => ({ params, searchParams: Promise.resolve(query) });
const redirectOf = async (run: () => Promise<unknown>) => { try { await run(); } catch (error) { return (error as Error).message; } return "no redirect"; };

function backend(routes: Record<string, unknown | Response>) {
  server.api.mockImplementation(async (path: string) => {
    const hit = Object.keys(routes).find((key) => path === key || path.startsWith(`${key}?`));
    if (!hit) return json({}, 503);
    const value = routes[hit];
    return value instanceof Response ? value.clone() : json(value);
  });
}

beforeEach(() => { server.api.mockReset(); });

describe("the care kit", () => {
  it("draws the ring card with its lines and the record row with its end value", () => {
    const html = render(<><CareHero tone="pink" icon="baby" label="Pregnancy" ring={{ value: 0.55, label: "Week 22 of 40", valueText: "22", caption: "week" }} title="Second trimester" lines={["Due soon"]} badge="Estimate" /><RecordRow icon="baby" tone="pink" title="Row" sub={["a", "b"]} end="3 kcal" /></>);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="55"');
    expect(html).toContain("Second trimester");
    expect(html).toContain("Estimate");
    expect(html).toContain("3 kcal");
    expect(html).not.toContain("style=");
  });

  it("marks the chosen chip pressed and gives dates a left-to-right input", () => {
    const html = render(<><ChoiceGroup label="Path" value="b" onChange={() => undefined} options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} /><TextField label="Date" type="date" value="" onChange={() => undefined} /></>);
    expect(html).toMatch(/aria-pressed="false"[^>]*>A</);
    expect(html).toMatch(/aria-pressed="true"[^>]*>B</);
    expect(html).toContain('dir="ltr"');
  });
});

describe("the maternity hub", () => {
  const pregnant = { data: { profile_ready: true, is_pregnant: true, current_week: 22, due_date: "2027-01-10T00:00:00.000Z", kicks_log: [{ id: "k1", count: 10, duration_seconds: 600, date: "2026-10-01T10:00:00.000Z" }], infant_growth: [{ id: "g1", month: 2, weight_kg: 5.1 }], patient_id: "private-patient" } };

  it("pregnancy tab: the week ring, the trimester, the due date, the logged kicks; no private field", async () => {
    backend({ "/maternity/profile": pregnant });
    const html = render(await MaternityPage(page()));
    expect(server.api).toHaveBeenCalledWith("/maternity/profile", {}, TOKEN);
    expect(html).toContain('aria-valuenow="55"');
    expect(html).toContain("Second trimester");
    expect(html).toContain("Movement count: 10");
    expect(html).toContain("/en/maternity?tab=baby");
    expect(html).toContain("/en/maternity?tab=ovulation");
    expect(html).toContain("/en/consultations/doctors?specialty=gynecology");
    for (const secret of [TOKEN, "private-patient"]) expect(html).not.toContain(secret);
  });

  it("baby tab lists the growth entries; ovulation tab says why there is no estimate for a pregnancy", async () => {
    backend({ "/maternity/profile": pregnant });
    expect(render(await MaternityPage(page({ tab: "baby" })))).toContain("Month 2");
    expect(render(await MaternityPage(page({ tab: "ovulation" })))).toContain("no ovulation estimate");
  });

  it("a cycle profile opens on the ovulation estimate, labelled as an estimate", async () => {
    backend({ "/maternity/profile": { profile_ready: true, is_pregnant: false, last_period_date: "2026-01-01T00:00:00.000Z", cycle_length: 28, is_regular: true } });
    const html = render(await MaternityPage(page()));
    expect(html).toContain("Estimated ovulation");
    expect(html).toContain("Jan 15, 2026");
    expect(html).toContain("Estimate");
  });

  it("no profile: the setup action; the backend down: the error state", async () => {
    backend({ "/maternity/profile": { profile_ready: false, tracking_mode: null } });
    expect(render(await MaternityPage(page()))).toContain("No maternity profile yet");
    backend({});
    expect(render(await MaternityPage(page()))).toContain("Maternity data could not be loaded");
  });

  it("the old tracker, growth pages redirect to the tabs and keep the query", async () => {
    expect(await redirectOf(async () => TrackerRedirect({ params, searchParams: Promise.resolve({ x: "1" }) }))).toBe("redirect:/en/maternity?x=1&tab=pregnancy");
    expect(await redirectOf(async () => BabyGrowthRedirect(page()))).toBe("redirect:/en/maternity?tab=baby");
  });

  it("the setup form renders both paths' fields with date inputs", async () => {
    const html = render(await MaternitySetupPage({ params }));
    expect(html).toContain("Maternity profile setup");
    expect(html).toContain('type="date"');
    expect(html).toContain("Save profile");
  });
});

describe("the nutrition hub", () => {
  it("today: the calories ring against the target, the water and the meals; no Plan tab; no private field", async () => {
    backend({
      "/nutrition/daily-summary": { data: { calories: 800, target_calories: 2000, water_ml: 500, patient_id: "private-patient" } },
      "/nutrition/meals": [{ id: "m1", name: "Oats", calories: 300, meal_type: "breakfast" }],
    });
    const html = render(await NutritionPage(page()));
    expect(html).toContain('aria-valuenow="40"');
    expect(html).toContain("Oats");
    expect(html).toContain("Breakfast");
    expect(html).toContain("/en/nutrition/log-meal");
    expect(html).toContain("/en/nutrition?tab=target");
    expect(html).not.toContain("tab=plan");
    expect(html).not.toContain("private-patient");
  });

  it("target tab holds the body-target form; an unknown or plan tab opens Today", async () => {
    backend({ "/nutrition/daily-summary": {}, "/nutrition/meals": [] });
    expect(render(await NutritionPage(page({ tab: "plan" })))).toContain("No meals logged today.");
    expect(render(await NutritionPage(page({ tab: "target" })))).toContain("Loading");
  });

  it("the summary down: the error state", async () => {
    backend({});
    expect(render(await NutritionPage(page()))).toContain("Nutrition data could not be loaded");
  });

  it("the log-meal form stays its own screen; the old body-target and plan routes redirect", async () => {
    expect(render(await LogMealPage({ params }))).toContain("Save meal");
    expect(await redirectOf(async () => BodyTargetRedirect(page()))).toBe("redirect:/en/nutrition?tab=target");
    expect(await redirectOf(async () => PlanRedirect(page()))).toBe("redirect:/en/nutrition?tab=plan");
  });
});

describe("mental health", () => {
  const dashboard = { mood: { total_entries: 4, avg_mood: 3.5, avg_energy: 3, avg_stress: 2, avg_sleep: 7 }, meditation: { total_sessions: 2, completed_sessions: 1, total_minutes: 20 } };

  it("the hub: the summary, the three ways in, and no self-assessment, crisis contacts or hard-coded number", async () => {
    backend({ "/mental-health/dashboard": dashboard });
    const html = render(await MentalHealthPage({ params }));
    expect(html).toContain("Mood entries");
    expect(html).toContain("/en/mental-health/mood");
    expect(html).toContain("/en/mental-health/relax");
    expect(html).toContain("/en/consultations/doctors?specialty=psychiatry");
    expect(html).not.toMatch(/self-assessment|crisis|tel:/i);
  });

  it("the mood journal lists the entries; the relax screen reads only the open tab", async () => {
    backend({ "/mental-health/mood": [{ id: "e1", mood: "calm", energy_level: 4, logged_at: "2026-10-01T10:00:00.000Z" }], "/mental-health/breathing": [{ id: "b1", technique: "box", rounds: 4, duration_seconds: 120 }], "/mental-health/meditation": [{ id: "d1", type: "body scan", duration_minutes: 10, completed: true }] });
    expect(render(await MoodPage({ params }))).toContain("calm");
    const breathing = render(await RelaxPage(page()));
    expect(breathing).toContain("box");
    expect(server.api).not.toHaveBeenCalledWith("/mental-health/meditation", {}, TOKEN);
    const meditation = render(await RelaxPage(page({ tab: "meditation" })));
    expect(meditation).toContain("body scan");
    expect(meditation).toContain("Completed");
  });

  it("the removed screens and the old tabs redirect", async () => {
    expect(await redirectOf(async () => BreathingRedirect(page()))).toBe("redirect:/en/mental-health/relax?tab=breathing");
    expect(await redirectOf(async () => CrisisRedirect(page()))).toBe("redirect:/en/mental-health");
    expect(await redirectOf(async () => SelfAssessmentRedirect(page()))).toBe("redirect:/en/mental-health");
    expect(await redirectOf(async () => TherapistRedirect(page()))).toBe("redirect:/en/consultations/doctors?specialty=psychiatry");
  });
});

describe("programs", () => {
  it("one screen: the progress ring, the next session, the reward and the sessions to mark done", async () => {
    backend({ "/medical/programs/active": { data: [{ id: "diabetes", title: "Diabetes", duration: "12 weeks", milestoneReward: "50 points", sessions: [{ id: 1, title: "Intro", status: "completed" }, { id: 2, title: "Diet", status: "scheduled" }] }] } });
    const html = render(await ProgramsPage({ params }));
    expect(html).toContain('aria-valuenow="50"');
    expect(html).toContain("Diet");
    expect(html).toContain("Mark completed");
    expect(html).toContain("50 points");
    expect(html).toContain("/en/loyalty");
  });

  it("empty and error states; /programs/active redirects here", async () => {
    backend({ "/medical/programs/active": { data: [] } });
    expect(render(await ProgramsPage({ params }))).toContain("No active health programs right now.");
    backend({});
    expect(render(await ProgramsPage({ params }))).toContain("Programs could not be loaded");
    expect(await redirectOf(async () => ProgramsActiveRedirect(page()))).toBe("redirect:/en/programs");
  });
});
