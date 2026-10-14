import { SERVICE_ICONS, SERVICE_TONES } from "@/components-next/ui-generated/icons/fill";

/**
 * The tones the labs and radiology screens draw, looked up from the handoff service map (§1) and never written as colour
 * names: the lab and radiology tiles, "good" (done, covered), "warn" (waiting, fasting, contrast), "info" (insurance,
 * results), "facility" (at the lab or the center), "health" (a date) and "quiet" (cancelled, not covered).
 */
export const DIAG_TONES = {
  lab: SERVICE_ICONS.lab.tone,
  radiology: SERVICE_ICONS.radiology.tone,
  good: SERVICE_ICONS.lab.tone,
  warn: SERVICE_ICONS.map.tone,
  info: SERVICE_ICONS.insurance.tone,
  facility: SERVICE_ICONS.nursing.tone,
  health: SERVICE_ICONS.health.tone,
  quiet: SERVICE_TONES[SERVICE_TONES.length - 1],
} as const;
