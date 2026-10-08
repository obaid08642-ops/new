/**
 * The AI assistant's pure parts (merge map section 4): which mode the URL asks for, the red flags the triage endpoint accepts
 * and how its answers are read. Nothing here decides a care level or writes an answer: the server's fields are shown, and a
 * payload without them is "no answer".
 */

export const ASSISTANT_MODES = ["symptoms", "prescription", "report"] as const;
export type AssistantMode = (typeof ASSISTANT_MODES)[number];

/** `?mode=` of the URL; anything else opens the symptoms mode. */
export function parseMode(value: unknown): AssistantMode {
  const first = Array.isArray(value) ? value[0] : value;
  return ASSISTANT_MODES.find((mode) => mode === first) ?? "symptoms";
}

/** The red flags POST /ai/triage accepts (the same list the mobile app offers); `none` is sent when nothing is ticked. */
export const RED_FLAGS = [
  "chest_pain",
  "breathing_difficulty",
  "fainting_or_unresponsive",
  "heavy_bleeding",
  "new_confusion",
  "severe_allergic_reaction",
  "severe_injury",
] as const;
export type RedFlag = (typeof RED_FLAGS)[number];

export const MIN_SYMPTOMS_LENGTH = 3;

export function triageRequestBody(symptoms: string, flags: readonly RedFlag[]): { symptoms: string; red_flags: string[] } {
  return { symptoms: symptoms.trim(), red_flags: flags.length > 0 ? [...flags] : ["none"] };
}

export type CareLevel = "emergency" | "consultation";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** The triage answer's `care_level` (the server derives it from the ticked red flags); null when the answer has none. */
export function triageCareLevel(payload: unknown): CareLevel | null {
  const root = record(payload);
  const source = record(root?.data) ?? root;
  const level = source?.care_level;
  return level === "emergency" || level === "consultation" ? level : null;
}

/** The text of an analysis answer (POST /api/ai/analyze-report); null when it has none. */
export function analysisSummary(payload: unknown): string | null {
  const root = record(payload);
  const nested = record(root?.data);
  for (const candidate of [root?.summary, root?.result, nested?.summary]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return null;
}
