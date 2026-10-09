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
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-token" }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: server.api }));

import AssistantPage from "@/app/[locale]/ai/page";
import MonthlyReportPage from "@/app/[locale]/ai/monthly-report/page";
import TriageRedirect from "@/app/[locale]/ai/triage/page";
import SymptomCheckerRedirect from "@/app/[locale]/ai/symptom-checker/page";
import TimelineRedirect from "@/app/[locale]/ai/symptom-timeline/page";
import TranslatorRedirect from "@/app/[locale]/ai/prescription-translator/page";
import ReportRedirect from "@/app/[locale]/ai/report/page";
import AiAnalysisRedirect from "@/app/[locale]/reports/ai-analysis/page";
import SkinRedirect from "@/app/[locale]/ai/skin-analysis/page";
import ChatDoctorRedirect from "@/app/[locale]/ai/chat-doctor/page";
import VoiceRedirect from "@/app/[locale]/voice/page";
import { AnswerCard, AskedBubble } from "@/components-next/assistant/assistant-kit";
import { analysisSummary, parseMode, RED_FLAGS, triageCareLevel, triageRequestBody } from "@/lib/ai/assistant";
import { isAllowedPatientApiRequest } from "@/lib/api/patient-allowlist";

const params = Promise.resolve({ locale: "en" });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const html = async (element: Promise<ReactNode>) => renderToStaticMarkup((await element) as ReactNode);
async function redirectOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    return String((error as Error).message).replace(/^redirect:/, "");
  }
  throw new Error("no redirect");
}

beforeEach(() => server.api.mockReset());

describe("the assistant's pure parts", () => {
  it("opens the mode the URL names and the symptoms mode for anything else", () => {
    expect(parseMode("report")).toBe("report");
    expect(parseMode(["prescription", "report"])).toBe("prescription");
    expect(parseMode("skin")).toBe("symptoms");
    expect(parseMode(undefined)).toBe("symptoms");
  });

  it("sends the ticked red flags, or none, with the trimmed text", () => {
    expect(triageRequestBody("  headache ", [])).toEqual({ symptoms: "headache", red_flags: ["none"] });
    expect(triageRequestBody("pain", ["chest_pain", "heavy_bleeding"])).toEqual({ symptoms: "pain", red_flags: ["chest_pain", "heavy_bleeding"] });
    expect(RED_FLAGS).toHaveLength(7);
  });

  it("reads only the server's care level, never a guess from the text", () => {
    expect(triageCareLevel({ care_level: "emergency", notice: "x" })).toBe("emergency");
    expect(triageCareLevel({ data: { care_level: "consultation" } })).toBe("consultation");
    expect(triageCareLevel({ response: "go to the ER now" })).toBeNull();
    expect(triageCareLevel({ care_level: "clinical_assessment" })).toBeNull();
    expect(triageCareLevel(null)).toBeNull();
  });

  it("reads the analysis text from the fields the endpoint answers with", () => {
    expect(analysisSummary({ summary: "A" })).toBe("A");
    expect(analysisSummary({ result: "B" })).toBe("B");
    expect(analysisSummary({ data: { summary: "C" } })).toBe("C");
    expect(analysisSummary({ summary: "  " })).toBeNull();
  });

  it("allows the triage and OCR calls and no longer the skin analysis", () => {
    expect(isAllowedPatientApiRequest("/ai/triage", "POST")).toBe(true);
    expect(isAllowedPatientApiRequest("/ai/prescription-ocr", "POST")).toBe(true);
    expect(isAllowedPatientApiRequest("/ai/skin-analysis", "POST")).toBe(false);
  });
});

describe("the answer card (decision 15, UI part)", () => {
  it("carries the disclaimer on every answer", () => {
    const out = renderToStaticMarkup(<AnswerCard icon="stethoscope" tone="blue" title="Title" disclaimer="NOT A DIAGNOSIS"><p>body</p></AnswerCard>);
    expect(out).toContain("NOT A DIAGNOSIS");
    expect(out).toContain('role="status"');
  });

  it("puts the actions of an urgent answer before its text, and the actions of a normal one after it", () => {
    const urgent = renderToStaticMarkup(<AnswerCard icon="warning" tone="coral" title="T" disclaimer="D" urgent actions={<a href="tel:1">ACT</a>}><p>BODY</p></AnswerCard>);
    expect(urgent).toContain('role="alert"');
    expect(urgent.indexOf("ACT")).toBeLessThan(urgent.indexOf("BODY"));
    const calm = renderToStaticMarkup(<AnswerCard icon="stethoscope" tone="blue" title="T" disclaimer="D" actions={<a href="/x">ACT</a>}><p>BODY</p></AnswerCard>);
    expect(calm.indexOf("BODY")).toBeLessThan(calm.indexOf("ACT"));
  });

  it("shows what was asked as the person's own bubble", () => {
    expect(renderToStaticMarkup(<AskedBubble text="my head hurts" label="What you asked" />)).toContain("my head hurts");
  });
});

describe("the assistant screen", () => {
  it("opens on the symptoms mode: the text, the seven red flags and the three mode links, with no skin or voice entry", async () => {
    const out = await html(AssistantPage({ params, searchParams: Promise.resolve({}) }));
    expect(out).toContain("Describe your symptoms");
    for (const label of ["Chest pain", "Trouble breathing", "Serious injury"]) expect(out).toContain(label);
    expect(out).toContain("/en/ai?mode=prescription");
    expect(out).toContain("/en/ai?mode=report");
    expect(out).not.toMatch(/skin-analysis|\/voice|chat-doctor/);
    expect(server.api).not.toHaveBeenCalled();
  });

  it("the prescription mode asks for a photo and keeps the same tabs", async () => {
    const out = await html(AssistantPage({ params, searchParams: Promise.resolve({ mode: "prescription" }) }));
    expect(out).toContain("Explain my prescription");
    expect(out).toContain('type="file"');
  });

  it("the report mode lists the person's reports from GET /medical-reports/mine", async () => {
    server.api.mockResolvedValue(json({ data: [{ id: "r1", title: "Blood count", created_at: "2026-09-01T08:00:00Z" }, { id: "r2", report_type: "ECG" }, { nope: true }] }));
    const out = await html(AssistantPage({ params, searchParams: Promise.resolve({ mode: "report" }) }));
    expect(server.api).toHaveBeenCalledWith("/medical-reports/mine?limit=100", {}, "server-only-token");
    expect(out).toContain("Blood count");
    expect(out).toContain("ECG");
    expect(out.match(/type="checkbox"/g)).toHaveLength(2);
  });

  it("says in place when the reports cannot load, and sends a lapsed session to sign-in", async () => {
    server.api.mockResolvedValue(json({}, 500));
    const out = await html(AssistantPage({ params, searchParams: Promise.resolve({ mode: "report" }) }));
    expect(out).toContain("could not be loaded");
    server.api.mockResolvedValue(json({}, 401));
    expect(await redirectOf(() => AssistantPage({ params, searchParams: Promise.resolve({ mode: "report" }) }))).toBe("/en/login");
  });

  it("an empty list says so instead of showing a button that cannot work", async () => {
    server.api.mockResolvedValue(json([]));
    const out = await html(AssistantPage({ params, searchParams: Promise.resolve({ mode: "report" }) }));
    expect(out).toContain("No medical reports available yet.");
    expect(out).not.toContain('type="checkbox"');
  });
});

describe("the old routes (merge map section 4)", () => {
  const sp = (query: Record<string, string>) => Promise.resolve(query);
  it("send each old screen to its mode and keep the query", async () => {
    expect(await redirectOf(() => TriageRedirect({ params, searchParams: sp({ ref: "n1" }) }))).toBe("/en/ai?ref=n1&mode=symptoms");
    expect(await redirectOf(() => SymptomCheckerRedirect({ params, searchParams: sp({}) }))).toBe("/en/ai?mode=symptoms");
    expect(await redirectOf(() => TimelineRedirect({ params, searchParams: sp({}) }))).toBe("/en/ai?mode=symptoms");
    expect(await redirectOf(() => TranslatorRedirect({ params, searchParams: sp({}) }))).toBe("/en/ai?mode=prescription");
    expect(await redirectOf(() => ReportRedirect({ params, searchParams: sp({ x: "1" }) }))).toBe("/en/ai?x=1&mode=report");
    expect(await redirectOf(() => AiAnalysisRedirect({ params, searchParams: sp({}) }))).toBe("/en/ai?mode=report");
  });

  it("send the removed features to the assistant and the doctor chat to the bookings list", async () => {
    expect(await redirectOf(() => SkinRedirect({ params, searchParams: sp({}) }))).toBe("/en/ai");
    expect(await redirectOf(() => VoiceRedirect({ params, searchParams: sp({}) }))).toBe("/en/ai");
    expect(await redirectOf(() => ChatDoctorRedirect({ params, searchParams: sp({ id: "t1" }) }))).toBe("/en/appointments?id=t1");
  });
});

describe("the monthly report", () => {
  const month = new Date();
  const inThisMonth = (day: number) => new Date(month.getFullYear(), month.getMonth(), day, 10, 0, 0).toISOString();
  function answer(by: Record<string, Response>) {
    server.api.mockImplementation(async (path: string) => by[path] ?? json({}, 500));
  }

  it("draws the counts, the vitals, the trends and the month's appointments from the four endpoints", async () => {
    answer({
      "/care/appointments": json({ data: [{ id: "a1", doctor_name: "Dr Hind", slot_start: inThisMonth(1), state: "COMPLETED" }, { id: "a2", specialty: "Cardiology", slot_start: inThisMonth(28), state: "CONFIRMED" }] }),
      "/health/vitals/summary": json({ data: [{ name: "Heart rate", value: 72, unit: "bpm" }] }),
      "/health/chronic-meds": json({ data: [{ id: "m1" }] }),
      "/health/trends": json({ data: [{ name: "Weight", unit: "kg", data: [{ value: 80 }, { value: 78 }] }] }),
    });
    const out = await html(MonthlyReportPage({ params }));
    for (const text of ["Dr Hind", "Cardiology", "Heart rate", "72 bpm", "Weight", "Falling", "Readings: 2"]) expect(out).toContain(text);
    expect(out).toContain("/en/health/vitals?tab=trends"); // the trends tab itself, not the old redirecting route (needs-review issue 681)
    expect(out).not.toMatch(/style=/);
  });

  it("shows the empty state with a way to log a reading when there is nothing", async () => {
    answer({ "/care/appointments": json({ data: [] }), "/health/vitals/summary": json({ data: [] }), "/health/chronic-meds": json({ data: [] }), "/health/trends": json({ data: [] }) });
    const out = await html(MonthlyReportPage({ params }));
    expect(out).toContain("Not enough data yet");
  });

  it("shows the error state when every source fails and signs in again when all say 401", async () => {
    answer({});
    expect(await html(MonthlyReportPage({ params }))).toContain("The report could not be loaded");
    server.api.mockImplementation(async () => json({}, 401));
    expect(await redirectOf(() => MonthlyReportPage({ params }))).toBe("/en/login");
  });
});
