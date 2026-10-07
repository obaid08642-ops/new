import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

import { useOptimisticAction } from "./use-optimistic-action";
import { shouldQueueOffline, type OptimisticOutcome } from "./optimistic";
import { outbox } from "./net/outbox";
import { clearToasts, getToasts } from "./net/toast";
import { ApiError } from "./net/errors";

/**
 * P15.4 — offline taps on safe actions queue instead of being lost; payments
 * never queue, they fail loudly now. Tested through the real hook (captured
 * from a statically rendered harness, the repo's component-test technique),
 * the real outbox singleton (memory-backed in node), and the real toast store.
 */

type RunFn = (
  kind: string,
  actions: { apply: () => void; rollback: () => void; commit: () => Promise<Response>; onCommitted?: (value: Response) => void },
  opts?: { outbox?: { kind: string; url: string; method?: string; headers?: Record<string, string>; body?: string | null } },
) => Promise<OptimisticOutcome<Response>>;

let captured: RunFn | null = null;

function Harness() {
  const { run } = useOptimisticAction<Response>();
  captured = run as RunFn;
  return null;
}

function captureRun(): RunFn {
  captured = null;
  renderToStaticMarkup(<Harness />);
  if (!captured) throw new Error("hook did not expose run");
  return captured;
}

beforeEach(() => {
  outbox.clear();
  clearToasts();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("P15.4 — shouldQueueOffline", () => {
  it("queues safe kinds only when actually offline", () => {
    expect(shouldQueueOffline("reminder", true)).toBe(true);
    expect(shouldQueueOffline("notification", true)).toBe(true);
    expect(shouldQueueOffline("reminder", false)).toBe(false);
  });

  it("never queues payment, booking, prescription or emergency", () => {
    for (const kind of ["payment", "booking", "prescription", "emergency"]) {
      expect(shouldQueueOffline(kind, true)).toBe(false);
    }
  });
});

describe("P15.4 — queue-when-offline through the hook", () => {
  it("applies instantly, enqueues, and toasts instead of sending", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const run = captureRun();
    const applied: string[] = [];
    const commit = vi.fn(async () => new Response("{}", { status: 200 }));

    const outcome = await run(
      "reminder",
      { apply: () => void applied.push("apply"), rollback: () => void applied.push("rollback"), commit },
      { outbox: { kind: "reminder", url: "/api/health/reminders/1/log", method: "POST", body: "{}" } },
    );

    expect(outcome.status).toBe("queued");
    expect(applied).toEqual(["apply"]);
    expect(commit).not.toHaveBeenCalled();
    expect(outbox.size()).toBe(1);
    expect(outbox.list()[0]).toMatchObject({ kind: "reminder", url: "/api/health/reminders/1/log" });
    expect(outbox.list()[0].idempotencyKey).toBeTruthy();
    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0]).toMatchObject({ kind: "info", message: "queued" });
  });

  it("sends normally when online, even with an outbox entry supplied", async () => {
    const run = captureRun();
    const commit = vi.fn(async () => new Response("{}", { status: 200 }));
    const applied: string[] = [];

    const outcome = await run(
      "reminder",
      { apply: () => void applied.push("apply"), rollback: () => void applied.push("rollback"), commit },
      { outbox: { kind: "reminder", url: "/api/health/reminders/1/log", method: "POST", body: "{}" } },
    );

    expect(outcome.status).toBe("committed");
    expect(commit).toHaveBeenCalledTimes(1);
    expect(outbox.size()).toBe(0);
    expect(getToasts()).toHaveLength(0);
  });

  it("lets a payment fail loudly offline instead of queueing it silently", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const run = captureRun();
    const offlineError = new ApiError("SERVICE_UNAVAILABLE", "check_connection", "offline", { reason: "offline" });
    const commit = vi.fn(async (): Promise<Response> => {
      throw offlineError;
    });

    const outcome = await run(
      "payment",
      { apply: () => {}, rollback: () => {}, commit },
      { outbox: { kind: "payment", url: "/api/pay", method: "POST", body: "{}" } },
    );

    expect(commit).toHaveBeenCalledTimes(1);
    expect(outcome.status).toBe("failed");
    expect(outbox.size()).toBe(0);
  });
});
