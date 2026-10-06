import { SERVICE_ICONS, type FillIconName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import type { VitalSummaryItem } from "@/lib/api/vitals";

/** The two service tones the health screens use, named by the service that owns them in the handoff map (never as a colour). */
export const CORAL: ServiceTone = SERVICE_ICONS.pharmacy.tone;
export const TEAL: ServiceTone = SERVICE_ICONS.nursing.tone;

export type VitalKey = VitalSummaryItem["key"];

/** The vitals in the order the board lists them (canvas/HealthHub: blood pressure, sugar, weight, temperature), then the rest. */
export const VITAL_ORDER: readonly VitalKey[] = ["bp", "glucose", "weight", "temperature", "heart_rate", "spo2"];
/** The four tiles the board always draws; the other two only when the patient has a reading. */
export const BOARD_VITALS: readonly VitalKey[] = ["bp", "glucose", "weight", "temperature"];

/** The icon and service tone of each vital, from the board's tiles (never written as a colour). */
export const VITAL_VIEW: Record<VitalKey, { icon: FillIconName; tone: ServiceTone }> = {
  bp: { icon: "heart", tone: CORAL },
  glucose: { icon: "drop", tone: "violet" },
  weight: { icon: "scales", tone: TEAL },
  temperature: { icon: "thermometer", tone: "amber" },
  heart_rate: { icon: "heartbeat", tone: CORAL },
  spo2: { icon: "drop", tone: "blue" },
};

/** The view of a vital named by a server id; an id this screen does not know gets the heartbeat glyph. */
export function vitalView(id: string): { icon: FillIconName; tone: ServiceTone } {
  return (VITAL_VIEW as Record<string, { icon: FillIconName; tone: ServiceTone }>)[id] ?? { icon: "heartbeat", tone: CORAL };
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
