"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Every pharmacy mutation of these screens (select an offer, accept the final price, register cash on delivery, accept
 * an insurance decision, start a payment, cancel, negotiate) goes through here, so they all behave the same:
 *
 *  - one request at a time: a second press while one is in flight does nothing (a runner flag, not only the disabled
 *    state, because two clicks can arrive before React re-renders);
 *  - the same idempotency key is reused when the outcome of a request is unknown (the network dropped, a 5xx), so a
 *    retry cannot do the action twice; a fresh key is made once the server has answered for good (success or a 4xx);
 *  - the failure is the real one: a short kind the screen turns into a translated sentence, never a fake success.
 */

export type ErrorKind =
  | "offerGone"
  | "alreadySelected"
  | "rxRequired"
  | "quoteChanged"
  | "notActionable"
  | "alreadyRecorded"
  | "alreadyPaid"
  | "threadClosed"
  | "contentBlocked"
  | "signedOut"
  | "forbidden"
  | "network"
  | "generic";

const CODES: Record<string, ErrorKind> = {
  offer_not_selectable: "offerGone",
  offer_stock_changed_requote_required: "offerGone",
  offer_selection_conflict: "offerGone",
  another_offer_already_selected: "alreadySelected",
  prescription_required_for_insurance_orders: "rxRequired",
  quote_hash_or_revision_mismatch: "quoteChanged",
  order_not_actionable: "notActionable",
  selected_quote_required: "notActionable",
  final_quote_acceptance_required: "notActionable",
  insurance_orders_follow_insurance_decision_flow: "notActionable",
  insurance_decision_pending: "notActionable",
  copay_acceptance_requires_partial_decision: "notActionable",
  self_pay_acceptance_not_applicable: "notActionable",
  // payment: the server's own reasons for refusing to start one
  payment_order_not_collectable: "notActionable",
  copay_acceptance_required: "notActionable",
  insurance_rejected_acceptance_required: "notActionable",
  covered_by_insurance_no_payment_due: "notActionable",
  cod_orders_do_not_require_online_payment: "notActionable",
  rejected_insurance_decision_required: "notActionable",
  rejected_order_cancellation_not_allowed_after_fulfillment: "notActionable",
  booking_already_paid: "alreadyPaid",
  insurance_acceptance_already_recorded: "alreadyRecorded",
  insurance_acceptance_conflict: "alreadyRecorded",
  thread_closed: "threadClosed",
  content_blocked: "contentBlocked",
};

/** The server's reason out of a Nest error body: `{ message: "code" }`, `{ message: { code } }` or `{ code }`. */
export function errorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as Record<string, unknown>;
  const message = record.message;
  if (typeof message === "string") return message;
  if (message && typeof message === "object" && typeof (message as Record<string, unknown>).code === "string") return (message as Record<string, string>).code;
  return typeof record.code === "string" ? record.code : undefined;
}

export function classifyError(status: number, code?: string): ErrorKind {
  if (status === 401) return "signedOut";
  if (status === 403) return "forbidden";
  if (status === 0 || status === 502 || status === 503 || status === 504) return "network";
  if (code && CODES[code]) return CODES[code];
  return "generic";
}

export type ActionResult = { ok: true; data: unknown } | { ok: false; kind: ErrorKind; status: number };

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** The framework-free core of the hook: the request, its idempotency keys and the one-at-a-time rule. */
export function createActionRunner(send: typeof fetch = globalThis.fetch.bind(globalThis), makeKey: () => string = newKey) {
  const keys = new Map<string, string>();
  let busy = false;
  return {
    get busy() { return busy; },
    /** `null` when another request is already in flight (nothing was sent). */
    async run(actionId: string, path: string, body: Record<string, unknown> = {}): Promise<ActionResult | null> {
      if (busy) return null;
      busy = true;
      const key = keys.get(actionId) ?? makeKey();
      keys.set(actionId, key);
      try {
        const response = await send(path, {
          method: "POST",
          headers: { "content-type": "application/json", "idempotency-key": key },
          body: JSON.stringify(body),
          credentials: "same-origin",
        });
        const payload: unknown = await response.json().catch(() => null);
        if (response.ok) {
          keys.delete(actionId);
          return { ok: true, data: payload };
        }
        // A 5xx may or may not have been applied: keep the key so the retry is the same request.
        if (response.status < 500) keys.delete(actionId);
        return { ok: false, kind: classifyError(response.status, errorCode(payload)), status: response.status };
      } catch {
        // The request may have reached the server: keep the key.
        return { ok: false, kind: "network", status: 0 };
      } finally {
        busy = false;
      }
    },
  };
}

export type ActionStatus = "idle" | "pending" | "failed" | "done";

export function usePharmacyAction() {
  const [status, setStatus] = useState<ActionStatus>("idle");
  const [error, setError] = useState<ErrorKind | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const runner = useRef<ReturnType<typeof createActionRunner> | null>(null);
  if (runner.current === null) runner.current = createActionRunner();

  const run = useCallback(async (actionId: string, path: string, body: Record<string, unknown> = {}): Promise<ActionResult | null> => {
    const active = runner.current;
    if (!active || active.busy) return null;
    setStatus("pending");
    setError(null);
    setActiveId(actionId);
    const result = await active.run(actionId, path, body);
    if (!result) return null;
    if (result.ok) {
      setStatus("done");
    } else {
      setStatus("failed");
      setError(result.kind);
    }
    return result;
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setActiveId(null);
  }, []);

  return { status, error, activeId, pending: status === "pending", run, reset };
}
