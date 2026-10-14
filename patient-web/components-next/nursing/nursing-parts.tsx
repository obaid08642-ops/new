import type { ReactNode } from "react";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { SERVICE_ICONS, type FillIconName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import styles from "./nursing.module.css";

/** The nursing service's own icon and tone, from the handoff service map (never written as a colour name). */
export const NURSING = SERVICE_ICONS.nursing;

/** The words a patient reads for a nursing booking, a visit or an insurance request; the raw code is never drawn. */
export type NursingStatusKey =
  | "requested"
  | "insuranceReview"
  | "waitingCopay"
  | "approvedFull"
  | "approvedPartial"
  | "rejected"
  | "confirmed"
  | "enRoute"
  | "arrived"
  | "inProgress"
  | "completed"
  | "cancelled"
  | "unknown";

/** The states of the booking, visit and insurance flows (the app's and the web's words) grouped into those phrases; anything else is "unknown". */
const GROUPS: Record<string, NursingStatusKey> = {
  NEW_REQUEST: "requested",
  REQUESTED: "requested",
  PENDING: "requested",
  PENDING_INSURANCE: "insuranceReview",
  WAITING_COPAY: "waitingCopay",
  APPROVED_FULL: "approvedFull",
  APPROVED_PARTIAL: "approvedPartial",
  REJECTED: "rejected",
  CONFIRMED: "confirmed",
  NURSE_EN_ROUTE: "enRoute",
  NURSE_ARRIVED: "arrived",
  CARE_IN_PROGRESS: "inProgress",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const TONES: Record<NursingStatusKey, ServiceTone> = {
  requested: DIAG_TONES.warn,
  insuranceReview: DIAG_TONES.warn,
  waitingCopay: DIAG_TONES.warn,
  approvedFull: DIAG_TONES.good,
  approvedPartial: DIAG_TONES.info,
  rejected: DIAG_TONES.quiet,
  confirmed: DIAG_TONES.info,
  enRoute: DIAG_TONES.info,
  arrived: DIAG_TONES.info,
  inProgress: DIAG_TONES.info,
  completed: DIAG_TONES.good,
  cancelled: DIAG_TONES.quiet,
  unknown: DIAG_TONES.quiet,
};

export function nursingStatus(state: string | undefined | null): { key: NursingStatusKey; tone: ServiceTone } {
  const key = (state && GROUPS[String(state).trim().toUpperCase()]) || "unknown";
  return { key, tone: TONES[key] };
}

/** The glyph of a service, found from the words of its name; every one stays in the nursing tone. */
const GLYPHS: Array<[RegExp, FillIconName]> = [
  [/دم|تحاليل|blood|lab/i, "test-tube"],
  [/علامات|ضغط|سكر|vital/i, "heartbeat"],
  [/جروح|غيار|قرح|wound/i, "first-aid"],
  [/حقن|وريد|محلول|injection|iv\b|drip/i, "syringe"],
  [/مسن|كبار|elderly|companion/i, "users-three"],
];
export function serviceIcon(...words: Array<string | undefined>): FillIconName {
  const text = words.filter(Boolean).join(" ");
  return GLYPHS.find(([re]) => re.test(text))?.[1] ?? NURSING.icon;
}

/** The caret of a row that goes to a page: it points the way the reader goes forward (mirrors in right-to-left). */
export function Caret({ rtl }: { rtl: boolean }) {
  return <Icon name={rtl ? "caret-left" : "caret-right"} size={18} tone="secondary" />;
}

/** The facts under a service's name: a duration and "accepts insurance" as chips (a fact the server did not send is not passed). */
export function ServiceChips({ duration, insurance }: { duration?: string; insurance?: string }) {
  if (!duration && !insurance) return null;
  return (
    <span className={styles.chips}>
      {duration ? <StatusChip label={duration} tone={NURSING.tone} /> : null}
      {insurance ? <StatusChip label={insurance} tone={DIAG_TONES.info} /> : null}
    </span>
  );
}

/** A small line under a row title (a date, a nurse, a count). */
export function MetaLine({ children }: { children: ReactNode }) {
  return <span className={styles.meta}>{children}</span>;
}

/** The status of a booking as a chip. */
export function StatusLine({ label, tone }: { label: string; tone: ServiceTone }) {
  return (
    <span className={styles.chips}>
      <StatusChip label={label} tone={tone} />
    </span>
  );
}

/** The list the rows of a screen sit in. */
export function RowList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul className={styles.list} aria-label={label}>
      {children}
    </ul>
  );
}
