import type { ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { DIAG_TONES } from "./tones";

export type DiagStatusKey = "pending" | "insurance" | "confirmed" | "arrived" | "sampled" | "processing" | "report" | "cancelled" | "unknown";

/**
 * The state of a lab or radiology booking, grouped into the few phrases a patient reads (the raw code is never drawn).
 * The states are the ones the two booking schemas list; any other value falls to "unknown" and is drawn as "status unavailable".
 */
const GROUPS: Record<string, DiagStatusKey> = {
  PENDING_ACCEPTANCE: "pending",
  NEW_REQUEST: "pending",
  PENDING_INSURANCE: "insurance",
  WAITING_COPAY: "insurance",
  ACCEPTED: "confirmed",
  CONFIRMED: "confirmed",
  CHECKED_IN: "arrived",
  ARRIVED_CHECKIN: "arrived",
  SAMPLE_COLLECTED: "sampled",
  LAB_PROCESSING: "processing",
  IN_SCANNING: "processing",
  SCANNING_COMPLETED: "processing",
  REPORT_DRAFT: "processing",
  UNDER_REVIEW: "processing",
  REPORT_UPLOADED: "report",
  REPORT_READY: "report",
  CANCELLED: "cancelled",
  SCAN_ABORTED: "cancelled",
  REJECTED: "cancelled",
};

const TONES: Record<DiagStatusKey, ServiceTone> = {
  pending: DIAG_TONES.warn,
  insurance: DIAG_TONES.info,
  confirmed: DIAG_TONES.good,
  arrived: DIAG_TONES.good,
  sampled: DIAG_TONES.facility,
  processing: DIAG_TONES.info,
  report: DIAG_TONES.good,
  cancelled: DIAG_TONES.quiet,
  unknown: DIAG_TONES.quiet,
};

export function diagStatus(state: string | undefined): { key: DiagStatusKey; tone: ServiceTone } {
  const key = (state && GROUPS[state.trim().toUpperCase()]) || "unknown";
  return { key, tone: TONES[key] };
}
