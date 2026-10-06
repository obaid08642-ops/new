import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import type { VitalSummaryItem } from "@/lib/api/vitals";

export type VitalKey = VitalSummaryItem["key"];

/** The vitals in the order the board lists them (canvas/HealthHub: blood pressure, sugar, weight, temperature), then the rest. */
export const VITAL_ORDER: readonly VitalKey[] = ["bp", "glucose", "weight", "temperature", "heart_rate", "spo2"];
/** The four tiles the board always draws; the other two only when the patient has a reading. */
export const BOARD_VITALS: readonly VitalKey[] = ["bp", "glucose", "weight", "temperature"];

/** The icon and service tone of each vital, from the board's tiles (never written as a colour). */
export const VITAL_VIEW: Record<VitalKey, { icon: FillIconName; tone: ServiceTone }> = {
  bp: { icon: "heart", tone: "coral" },
  glucose: { icon: "drop", tone: "violet" },
  weight: { icon: "scales", tone: "teal" },
  temperature: { icon: "thermometer", tone: "amber" },
  heart_rate: { icon: "heartbeat", tone: "coral" },
  spo2: { icon: "drop", tone: "blue" },
};

/** The view of a vital named by a server id; an id this screen does not know gets the heartbeat glyph. */
export function vitalView(id: string): { icon: FillIconName; tone: ServiceTone } {
  return (VITAL_VIEW as Record<string, { icon: FillIconName; tone: ServiceTone }>)[id] ?? { icon: "heartbeat", tone: "coral" };
}

/** The tab named in the URL, or the fallback: a stale or hand-typed value never breaks the page. */
export function pickTab<T extends string>(value: string | string[] | undefined, allowed: readonly T[], fallback: T): T {
  const raw = Array.isArray(value) ? value[0] : value;
  return (allowed as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback;
}

/** A flag in the URL (`?add=1`): the sheet that opens on load. It never carries health data. */
export function isFlag(value: string | string[] | undefined): boolean {
  return (Array.isArray(value) ? value[0] : value) === "1";
}
