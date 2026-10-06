// No zod: the result screen is a client component. Everything here only READS what the server sent; it never decides
// that a payment happened. "Paid" is the server's word (`payment_status: "paid"` on the order, or a verified transaction).

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

export type OrderPaymentView = {
  /** The order's own status (`cash_card_payment_pending`, `cancelled` ...). */
  status?: string;
  /** The governed step the server derived (`FINAL_QUOTE_ACCEPTED` ...); absent before an offer is selected. */
  governedState?: string;
  coverageMode?: "cash" | "insurance";
  /** `paid` once a payment was verified, `covered_by_insurance` when insurance covers the order in full. */
  paymentStatus?: string;
  /** The price the patient accepted (or the selected offer's), as the server's snapshot states it. */
  totals?: { subtotal?: number; deliveryFee?: number; total?: number; currency?: string };
  insurance?: { decision?: string; coPayAmount?: number; insurerShare?: number };
  address?: { label?: string; street?: string; district?: string; city?: string };
};

/** The payment-relevant part of `GET /patient/pharmacy/orders/:id`. */
export function parseOrderPaymentView(payload: unknown): OrderPaymentView | null {
  const root = record(payload);
  const source = record(root?.data) ?? root;
  if (!source) return null;
  const snapshot = record(source.accepted_quote_snapshot) ?? record(source.selected_offer_snapshot);
  const totals = record(snapshot?.totals);
  const summary = record(source.insurance_decision_summary);
  const address = record(source.delivery_address);
  const coverage = text(source.coverage_mode);
  return {
    status: text(source.status),
    governedState: text(source.governed_state),
    coverageMode: coverage === "cash" || coverage === "insurance" ? coverage : undefined,
    paymentStatus: text(source.payment_status),
    totals: totals ? { subtotal: num(totals.subtotal), deliveryFee: num(totals.delivery_fee), total: num(totals.total), currency: text(totals.currency) } : undefined,
    insurance: summary ? { decision: text(summary.decision), coPayAmount: num(summary.co_pay_amount), insurerShare: num(summary.insurer_share) } : undefined,
    address: address ? { label: text(address.label), street: text(address.street), district: text(address.district), city: text(address.city) } : undefined,
  };
}

export type PaymentMethodId = "card" | "apple-pay" | "google-pay";
const METHODS: readonly string[] = ["card", "apple-pay", "google-pay"];

/** What `GET /payments/pharmacy/:id/capabilities` answered: the amount due and the methods, or why there is none. */
export type CapabilitiesResult =
  | { status: "ok"; amount: number; currency: string; methods: PaymentMethodId[] }
  /** The server refused with a reason (`copay_acceptance_required` ...). */
  | { status: "refused"; code?: string }
  /** The server could not be reached or failed. */
  | { status: "error" };

export type PaymentPageState =
  | { kind: "paid" }
  | { kind: "covered" }
  | { kind: "cod" }
  | { kind: "closed" }
  | { kind: "fulfilment" }
  | { kind: "noQuote" }
  | { kind: "acceptFirst" }
  | { kind: "insuranceFirst" }
  | { kind: "payable"; amount: number; currency: string; methods: PaymentMethodId[] }
  | { kind: "unavailable"; reason: "noMethods" | "refused" | "error" };

const FULFILMENT = new Set(["CONFIRMED", "IN_FULFILLMENT", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"]);
const CLOSED_STATUS = new Set(["cancelled", "expired"]);

/** Whether the screen has to ask the server for the amount and methods: only a step where a payment can be due. */
export function needsCapabilities(view: OrderPaymentView): boolean {
  if (view.paymentStatus === "paid" || view.paymentStatus === "covered_by_insurance") return false;
  if (CLOSED_STATUS.has((view.status ?? "").toLowerCase())) return false;
  return view.governedState === "FINAL_QUOTE_ACCEPTED" || view.governedState === "INSURANCE_DECISION_READY";
}

/**
 * Which screen the payment page shows, from the order the server returned and (when asked) its payment capabilities.
 * The amount is the server's `amount`; this function never adds, subtracts or rounds a number.
 */
export function paymentPageState(view: OrderPaymentView, caps: CapabilitiesResult | null): PaymentPageState {
  if (view.paymentStatus === "paid") return { kind: "paid" };
  const governed = view.governedState ?? "";
  if (governed === "CANCELLED" || CLOSED_STATUS.has((view.status ?? "").toLowerCase())) return { kind: "closed" };
  if (view.paymentStatus === "covered_by_insurance" || (governed === "CONFIRMED" && view.coverageMode === "insurance" && view.insurance?.decision === "APPROVED_FULL")) return { kind: "covered" };
  if (governed === "COD_REGISTERED") return { kind: "cod" };
  if (FULFILMENT.has(governed)) return { kind: "fulfilment" };
  if (!governed) return { kind: "noQuote" };
  if (governed === "OFFER_SELECTED" || governed === "FINAL_QUOTE_READY") return { kind: "acceptFirst" };
  if (governed === "INSURANCE_PROCESSING") return { kind: "insuranceFirst" };
  if (!caps) return { kind: "unavailable", reason: "error" };
  if (caps.status === "ok") {
    return caps.methods.length > 0 ? { kind: "payable", amount: caps.amount, currency: caps.currency, methods: caps.methods } : { kind: "unavailable", reason: "noMethods" };
  }
  if (caps.status === "refused") {
    switch (caps.code) {
      case "copay_acceptance_required":
      case "insurance_rejected_acceptance_required":
      case "insurance_decision_pending":
        return { kind: "insuranceFirst" };
      case "final_quote_acceptance_required":
        return { kind: "acceptFirst" };
      case "selected_quote_required":
        return { kind: "noQuote" };
      case "covered_by_insurance_no_payment_due":
        return { kind: "covered" };
      case "cod_orders_do_not_require_online_payment":
        return { kind: "cod" };
      default:
        return { kind: "unavailable", reason: "refused" };
    }
  }
  return { kind: "unavailable", reason: "error" };
}

/** The server's capabilities answer, as an object the screen can branch on. `body` is the parsed JSON, `status` the HTTP status. */
export function capabilitiesFrom(status: number, body: unknown, orderId: string): CapabilitiesResult {
  if (status >= 200 && status < 300) {
    const root = record(body);
    const source = record(root?.data) ?? root;
    const amount = num(source?.amount);
    const currency = text(source?.currency);
    const booking = text(source?.booking_id) ?? text(source?.bookingId);
    if (!source || amount === undefined || amount <= 0 || !currency || booking !== orderId) return { status: "error" };
    const methods: PaymentMethodId[] = [];
    for (const method of Array.isArray(source.methods) ? source.methods : []) {
      const id = record(method)?.id;
      if (typeof id === "string" && METHODS.includes(id) && !methods.includes(id as PaymentMethodId)) methods.push(id as PaymentMethodId);
    }
    return { status: "ok", amount, currency, methods };
  }
  if (status >= 400 && status < 500) {
    const root = record(body);
    const message = root?.message;
    const code = typeof message === "string" ? message : typeof record(message)?.code === "string" ? (record(message)?.code as string) : text(root?.code);
    return { status: "refused", code };
  }
  return { status: "error" };
}

/* ---------------------------------------------------------------- the result screen */

/** What a payment transaction's status means for the patient. */
export type PaymentOutcome = "paid" | "pending" | "failed" | "refunded";

/** The backend's transaction statuses: paid, failed, cancelled, refunded, partially_refunded, and the open ones. Unknown reads as still pending, never as paid. */
export function outcomeOfTransactionStatus(status: unknown): PaymentOutcome {
  const value = typeof status === "string" ? status.trim().toLowerCase() : "";
  if (value === "paid") return "paid";
  if (value === "failed" || value === "cancelled" || value === "canceled") return "failed";
  if (value === "refunded" || value === "partially_refunded") return "refunded";
  return "pending";
}

/** The bounded answer of `POST /api/payments/verify/:txn` (`{ transactionId, status }`). */
export function parseVerification(payload: unknown): { outcome: PaymentOutcome } | null {
  const root = record(payload);
  const source = record(root?.data) ?? root;
  const status = text(source?.status);
  return status ? { outcome: outcomeOfTransactionStatus(status) } : null;
}
