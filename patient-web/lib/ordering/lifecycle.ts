/**
 * Ord08-Ord10 (waiting states, partial approval, tracking): the pure part. Parsers of the five patient reads of one ordering booking
 * (GET /ordering/bookings/:id, /approval, /visit, /reminders, /results) and the answers of the two patient actions (partial-choice,
 * emergency). Every amount is a server number kept as is: nothing is added, subtracted or estimated here. The only arithmetic is the
 * countdown to the server's `confirm_deadline_at`.
 */
type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const text = (v: unknown) => (typeof v === "string" && v ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const unwrap = (payload: unknown): Raw | null => {
  const r = obj(payload);
  return r && obj(r.data) && !("id" in r) && !("status" in r) ? obj(r.data) : r;
};

export type BookingView = {
  id: string; status: string; state: string | null; mode: "home" | "facility"; total: number | null; items: Array<{ catalogId: string; price: number }>;
  confirmDeadlineAt: string | null; payment: { amount: number | null; status: string; refundStatus: string | null };
  alternative: { providerId: string; total: number; earliestAt: string } | null;
};

export function parseBookingView(payload: unknown): BookingView | null {
  const r = unwrap(payload);
  const id = r && text(r.id);
  if (!r || !id) return null;
  const pay = obj(r.payment);
  const alt = obj(r.alternative);
  const items = (Array.isArray(r.items) ? r.items : []).flatMap((i) => {
    const l = obj(i);
    return l && text(l.catalog_id) && num(l.price) !== null ? [{ catalogId: l.catalog_id as string, price: l.price as number }] : [];
  });
  return {
    id, status: text(r.status) ?? "pending", state: text(r.state), mode: r.mode === "home" ? "home" : "facility", total: num(r.total), items,
    confirmDeadlineAt: text(r.confirm_deadline_at),
    payment: { amount: pay ? num(pay.amount) : null, status: (pay && text(pay.status)) || "pending", refundStatus: pay ? text(pay.refund_status) : null },
    alternative: alt && text(alt.provider_id) && num(alt.total) !== null && text(alt.earliest_at) ? { providerId: alt.provider_id as string, total: alt.total as number, earliestAt: alt.earliest_at as string } : null,
  };
}

export type Decision = "approved" | "rejected" | "pending";
export type ApprovalItem = { catalogId: string; decision: Decision; price: number | null; coverage: string | null; insurerShare: number | null; patientShare: number | null; estimatedShare: number | null };
export type Choice = "pay_difference" | "covered_only" | "cancel_free";
export type Approval = {
  status: "pending" | "approved" | "partial" | "rejected"; items: ApprovalItem[]; final: boolean; estimate: boolean;
  patientShareTotal: number | null; estimatedShareTotal: number | null; homeFee: { amount: number; covered: boolean } | null;
  validUntil: string | null; expiresBeforeVisit: boolean; rebookEarlier: boolean; choices: Choice[];
};

const CHOICES: Choice[] = ["pay_difference", "covered_only", "cancel_free"];

export function parseApproval(payload: unknown): Approval | null {
  const r = unwrap(payload);
  const status = r && r.status;
  if (!r || (status !== "pending" && status !== "approved" && status !== "partial" && status !== "rejected")) return null;
  const fee = obj(r.home_fee);
  const items = (Array.isArray(r.items) ? r.items : []).flatMap((i): ApprovalItem[] => {
    const l = obj(i);
    if (!l || !text(l.catalog_id)) return [];
    return [{
      catalogId: l.catalog_id as string, decision: l.decision === "approved" || l.decision === "rejected" ? l.decision : "pending",
      price: num(l.price), coverage: text(l.coverage), insurerShare: num(l.insurer_share), patientShare: num(l.patient_share), estimatedShare: num(l.estimated_patient_share),
    }];
  });
  return {
    status, items, final: r.final === true, estimate: r.estimate === true,
    patientShareTotal: num(r.patient_share_total), estimatedShareTotal: num(r.estimated_patient_share_total),
    homeFee: fee && num(fee.amount) !== null ? { amount: fee.amount as number, covered: fee.covered === true } : null,
    validUntil: text(r.valid_until), expiresBeforeVisit: r.warning === "approval_expires_before_visit", rebookEarlier: r.rebook_earlier === true,
    choices: (Array.isArray(r.choices) ? r.choices : []).filter((c): c is Choice => CHOICES.includes(c as Choice)),
  };
}

/** The patient has to answer: the insurer decided only part of the request (or none) and no choice is taken yet. */
export const awaitingChoice = (a: Approval | null): boolean => !!a && (a.status === "partial" || a.status === "rejected") && !a.final && a.choices.length > 0;

export type Visit = {
  status: string;
  provider: { nameAr: string | null; nameEn: string | null; license: string | null; photoUrl: string | null };
  staff: { name: string; license: string | null; photoUrl: string | null } | null;
  arrivalCode: string | null;
};

const httpsUrl = (v: unknown) => (typeof v === "string" && v.startsWith("https://") ? v : null);

export function parseVisit(payload: unknown): Visit | null {
  const r = unwrap(payload);
  if (!r) return null;
  const p = obj(r.provider) ?? {};
  const s = obj(r.staff);
  const code = text(r.arrival_code);
  return {
    status: text(r.status) ?? "pending",
    provider: { nameAr: text(p.name_ar), nameEn: text(p.name_en), license: text(p.license), photoUrl: httpsUrl(p.photo_url) },
    staff: s && text(s.name) ? { name: s.name as string, license: text(s.license), photoUrl: httpsUrl(s.photo_url) } : null,
    arrivalCode: code && /^[0-9]{4}$/.test(code) ? code : null,
  };
}

export type ReminderKind = "fasting_night" | "fasting_morning" | "preparation";
export type Reminder = { kind: ReminderKind; at: string };

export function parseReminders(payload: unknown): Reminder[] {
  const r = unwrap(payload);
  return (r && Array.isArray(r.reminders) ? r.reminders : []).flatMap((x): Reminder[] => {
    const l = obj(x);
    const at = l && text(l.at);
    return l && at && !Number.isNaN(new Date(at).getTime()) && (l.kind === "fasting_night" || l.kind === "fasting_morning" || l.kind === "preparation") ? [{ kind: l.kind, at }] : [];
  });
}

/** `{ call }` of the emergency button: the urgent-help number, digits and a leading plus only. */
export function parseEmergency(payload: unknown): { call: string } | null {
  const r = unwrap(payload);
  return r && typeof r.call === "string" && /^[0-9+]{2,15}$/.test(r.call) ? { call: r.call } : null;
}

export function parseChoiceAnswer(payload: unknown): { choice: Choice; patientShareTotal: number | null } | null {
  const r = unwrap(payload);
  return r && CHOICES.includes(r.choice as Choice) ? { choice: r.choice as Choice, patientShareTotal: num(r.patient_share_total) } : null;
}

// ---------- states ----------

/** Seconds from `nowMs` to the server's deadline (0 when passed, null when the booking has none). */
export function secondsUntil(deadlineIso: string | null, nowMs: number): number | null {
  if (!deadlineIso) return null;
  const t = new Date(deadlineIso).getTime();
  return Number.isNaN(t) ? null : Math.max(0, Math.ceil((t - nowMs) / 1000));
}

export type StepState = "done" | "now" | "next";
export type StepKey = "paid" | "confirm" | "insurance" | "visit";

const CLOSED = new Set(["cancelled", "canceled", "rejected", "declined", "completed", "reported"]);

export const isCancelled = (b: Pick<BookingView, "status" | "state">): boolean => b.status === "cancelled" || b.state === "CANCELLED";
export const isWaiting = (b: BookingView): boolean => !isCancelled(b) && !CLOSED.has(b.status);

/** The progress line of the board: paid, provider confirms, insurance approval (insured bookings only), visit. */
export function stepsOf(b: BookingView, insured: boolean, approval: Approval | null): Array<{ key: StepKey; state: StepState }> {
  const paid = b.payment.status === "paid" || b.payment.status === "partially_refunded";
  const confirmed = !isCancelled(b) && b.confirmDeadlineAt === null; // the server clears the deadline once the provider confirmed (or for a broadcast booking)
  const approved = approval ? approval.status === "approved" || approval.final : false;
  const keys: StepKey[] = insured ? ["confirm", "insurance", "visit"] : ["paid", "confirm", "visit"];
  const done: Record<StepKey, boolean> = { paid, confirm: confirmed, insurance: approved, visit: b.status === "in_service" };
  let seenNow = false;
  return keys.map((key) => {
    if (done[key]) return { key, state: "done" as const };
    if (!seenNow) { seenNow = true; return { key, state: "now" as const }; }
    return { key, state: "next" as const };
  });
}

/** Message key (suffix after "track") of the booking status line; an unknown status gets a neutral line, never the raw code. */
export function statusKey(b: BookingView): string {
  if (isCancelled(b)) return "StCancelled";
  switch (b.status) {
    case "pending": return b.confirmDeadlineAt ? "StPending" : "StConfirmed";
    case "awaiting_approval": return "StApproval";
    case "awaiting_patient_choice": return "StChoice";
    case "confirmed": return "StConfirmed";
    case "assigned": return "StAssigned";
    case "in_service": return "StInService";
    default: return "StOther";
  }
}

export const paymentKey = (status: string): string | null => (status === "paid" ? "PayPaid" : status === "pending" ? "PayPending" : status === "refunded" || status === "partially_refunded" ? "PayRefunded" : null);

const ERROR_KEYS: Record<string, string> = {
  choice_not_pending: "partErrDone",
  nothing_covered: "partErrNothing",
  approval_not_found: "trackErrGone",
  booking_not_found: "trackErrGone",
  booking_closed: "trackErrClosed",
};

/** Message key (OrderingFlow) of a stable backend error code of these screens; anything else is the generic line. */
export function lifecycleErrorKey(code: unknown): string {
  return typeof code === "string" && ERROR_KEYS[code] ? ERROR_KEYS[code] : "errGeneric";
}
