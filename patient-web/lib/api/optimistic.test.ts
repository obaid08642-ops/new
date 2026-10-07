import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isNeverOptimistic,
  isOfflineFailure,
  isSafeOptimistic,
  pendingMode,
  runOptimistic,
} from "./optimistic";

// Intentionally literal, NOT imported from the module under test: if the
// production lists are weakened, these tests must go red, not vanish.
const SAFE_OPTIMISTIC_KINDS = ["cart", "wishlist", "reminder", "notification", "like"] as const;
const NEVER_OPTIMISTIC_KINDS = ["payment", "booking", "prescription", "emergency"] as const;
import { failureBody } from "./use-optimistic-action";
import { ApiError } from "./net/errors";
import { clearToasts, dismissToast, getToasts, showToast, subscribeToasts } from "./net/toast";

/**
 * P15.3 — the two proofs the plan requires:
 *   1. a forced 500 on a safe action → the UI change is rolled back AND a toast
 *      explains it;
 *   2. a never-optimistic kind (payment/booking/prescription/emergency) never
 *      touches local state, success or failure — the UI stays in "processing"
 *      until the server confirms.
 */

const copy = {
  rollbackTitle: "Change not saved",
  failedTitle: "Request failed",
  messageFor: (error: unknown) => (error instanceof ApiError ? `${error.code}:${error.action}` : "unknown"),
};

function failingCommit(status: number) {
  return vi.fn(async () => {
    throw new ApiError(status === 429 ? "RATE_LIMITED" : "SERVICE_UNAVAILABLE", "retry", `request_failed_${status}`, {
      status,
      reason: "status",
    });
  });
}

beforeEach(() => clearToasts());

describe("P15.3 — safe kinds apply, commit, and roll back with a toast", () => {
  for (const kind of SAFE_OPTIMISTIC_KINDS) {
    it(`${kind}: commits without touching the toast store`, async () => {
      const apply = vi.fn();
      const rollback = vi.fn();
      const toast = vi.fn();
      const onCommitted = vi.fn();
      const commit = vi.fn(async () => "ok");

      const outcome = await runOptimistic({ kind, apply, rollback, commit, toast, copy, onCommitted });

      expect(outcome).toEqual({ status: "committed", optimistic: true, value: "ok" });
      expect(apply).toHaveBeenCalledTimes(1);
      expect(rollback).not.toHaveBeenCalled();
      expect(toast).not.toHaveBeenCalled();
      expect(onCommitted).toHaveBeenCalledWith("ok");
      expect(getToasts()).toEqual([]);
    });

    it(`${kind}: a forced 500 rolls back and pushes an explaining toast`, async () => {
      const order: string[] = [];
      const toast = vi.fn((t: { title: string; message: string }) => {
        order.push("toast");
      });

      const outcome = await runOptimistic({
        kind,
        apply: () => void order.push("apply"),
        rollback: () => void order.push("rollback"),
        commit: failingCommit(500),
        toast,
        copy,
      });

      expect(outcome.status).toBe("rolled_back");
      expect(order).toEqual(["apply", "rollback", "toast"]);
      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast.mock.calls[0][0]).toMatchObject({
        kind: "error",
        title: "Change not saved",
        // The message carries the SERVER's catalog mapping, not a generic string.
        message: "SERVICE_UNAVAILABLE:retry",
      });
    });
  }

  it("a local apply failure is still surfaced, not swallowed", async () => {
    const boom = new Error("local_render_failed");
    const commit = vi.fn(async () => "ok");
    const toast = vi.fn();
    const rollback = vi.fn();

    const outcome = await runOptimistic({
      kind: "reminder",
      apply: () => {
        throw boom;
      },
      rollback,
      commit,
      toast,
      copy,
    });

    expect(outcome).toEqual({ status: "rolled_back", optimistic: true, error: boom });
    expect(commit).not.toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0].title).toBe("Request failed");
  });
});

describe("P15.3 — payment, booking, prescription and emergency are NEVER optimistic", () => {
  for (const kind of NEVER_OPTIMISTIC_KINDS) {
    it(`${kind}: success commits without ever applying locally`, async () => {
      const apply = vi.fn();
      const rollback = vi.fn();
      const toast = vi.fn();
      const commit = vi.fn(async () => "confirmed");

      const outcome = await runOptimistic({ kind, apply, rollback, commit, toast, copy });

      expect(outcome).toEqual({ status: "committed", optimistic: false, value: "confirmed" });
      expect(apply).not.toHaveBeenCalled();
      expect(rollback).not.toHaveBeenCalled();
      expect(toast).not.toHaveBeenCalled();
    });

    it(`${kind}: failure reports without pretending anything changed`, async () => {
      const apply = vi.fn();
      const rollback = vi.fn();
      const toast = vi.fn();

      const outcome = await runOptimistic({ kind, apply, rollback, commit: failingCommit(500), toast, copy });

      // "failed", NOT "rolled_back": there was never a local change to undo.
      expect(outcome.status).toBe("failed");
      expect(apply).not.toHaveBeenCalled();
      expect(rollback).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast.mock.calls[0][0].title).toBe("Request failed");
    });

    it(`${kind}: the UI contract is "processing", not "saved"`, () => {
      expect(pendingMode(kind)).toBe("processing");
      expect(isNeverOptimistic(kind)).toBe(true);
      expect(isSafeOptimistic(kind)).toBe(false);
    });
  }

  for (const kind of SAFE_OPTIMISTIC_KINDS) {
    it(`${kind}: the UI contract is optimistic`, () => {
      expect(pendingMode(kind)).toBe("optimistic");
      expect(isNeverOptimistic(kind)).toBe(false);
      expect(isSafeOptimistic(kind)).toBe(true);
    });
  }

  it("an unknown kind is processing, never optimistic (deny by default)", () => {
    expect(pendingMode("something-new")).toBe("processing");
    expect(isNeverOptimistic("something-new")).toBe(false);
    expect(isSafeOptimistic("something-new")).toBe(false);
  });

  it('a typo\'d kind ("paymnt") never applies optimistically', async () => {
    expect(pendingMode("paymnt")).toBe("processing");
    const apply = vi.fn();
    const rollback = vi.fn();
    const toast = vi.fn();
    const commit = vi.fn(async () => "confirmed");

    const outcome = await runOptimistic({ kind: "paymnt", apply, rollback, commit, toast, copy });

    // "failed", NOT "committed-optimistic" and NOT "rolled_back": nothing was
    // ever applied locally, so there is nothing to undo.
    expect(outcome).toEqual({ status: "committed", optimistic: false, value: "confirmed" });
    expect(apply).not.toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('a typo\'d kind ("paymnt") reports failure without pretending anything changed', async () => {
    const apply = vi.fn();
    const rollback = vi.fn();
    const toast = vi.fn();

    const outcome = await runOptimistic({ kind: "paymnt", apply, rollback, commit: failingCommit(500), toast, copy });

    expect(outcome.status).toBe("failed");
    expect(apply).not.toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0].title).toBe("Request failed");
  });
});

describe("P15.3 — the toast store", () => {
  it("shows, lists, dismisses and notifies subscribers", () => {
    const seen: number[][] = [];
    const unsubscribe = subscribeToasts((next) => seen.push(next.map((t) => t.id)));

    const id = showToast({ kind: "error", title: "t", message: "m" });
    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0]).toMatchObject({ id, kind: "error", title: "t", message: "m" });

    dismissToast(id + 999);
    expect(getToasts()).toHaveLength(1);

    dismissToast(id);
    expect(getToasts()).toEqual([]);

    // One publish per mutation: show, (no-op dismiss still publishes), dismiss.
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen[seen.length - 1]).toEqual([]);
    unsubscribe();
  });

  it("carries the support reference when the error has a digest", () => {
    showToast({ kind: "error", title: "t", message: "m", reference: "abc123" });
    expect(getToasts()[0].reference).toBe("abc123");
  });
});

describe("P15.3 — helpers", () => {
  it("failureBody joins message and next step, or returns the message alone", () => {
    expect(failureBody(() => ({ message: "m", nextStep: "n" }), new Error("x"))).toBe("m n");
    expect(failureBody(() => ({ message: "m", nextStep: "" }), new Error("x"))).toBe("m");
  });

  it("isOfflineFailure only matches transport reasons", () => {
    expect(isOfflineFailure(new ApiError("SERVICE_UNAVAILABLE", "check_connection", "offline", { reason: "offline" }))).toBe(true);
    expect(isOfflineFailure(new ApiError("SERVICE_UNAVAILABLE", "check_connection", "x", { reason: "network" }))).toBe(true);
    expect(isOfflineFailure(new ApiError("SERVICE_UNAVAILABLE", "retry", "x", { reason: "timeout" }))).toBe(false);
    expect(isOfflineFailure(new Error("x"))).toBe(false);
    expect(isOfflineFailure(null)).toBe(false);
  });
});
