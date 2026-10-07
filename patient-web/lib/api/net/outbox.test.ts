import { describe, expect, it } from "vitest";
import { createOutbox, memoryOutboxStorage, OUTBOX_MAX_ACTIONS } from "./outbox";

/**
 * P15.4 — the outbox contract:
 *   - safe actions queue and replay in FIFO order;
 *   - the first failure stops the drain with the remainder untouched;
 *   - payments (and bookings, prescriptions, emergency) can never enter;
 *   - every replayed mutation carries an idempotency key.
 */

function ok() {
  return new Response("{}", { status: 200 });
}

function failed(status = 500) {
  return new Response("boom", { status });
}

describe("P15.4 — queue order and replay", () => {
  it("replays safe actions in the order they were queued", async () => {
    const outbox = createOutbox(memoryOutboxStorage());
    const seen: string[] = [];
    outbox.enqueue({ kind: "reminder", url: "/a", method: "POST", body: "{}" });
    outbox.enqueue({ kind: "notification", url: "/b", method: "PATCH", body: "{}" });
    outbox.enqueue({ kind: "like", url: "/c", method: "GET" });

    const result = await outbox.replay(async (action) => {
      seen.push(action.url);
      return ok();
    });

    expect(seen).toEqual(["/a", "/b", "/c"]);
    expect(result).toEqual({ sent: expect.any(Array), failedId: null, remaining: 0 });
    expect(result.sent).toHaveLength(3);
    expect(outbox.size()).toBe(0);
  });

  it("stops at the first failure and keeps the remainder untouched", async () => {
    const outbox = createOutbox(memoryOutboxStorage());
    outbox.enqueue({ kind: "reminder", url: "/first", method: "POST", body: "{}" });
    outbox.enqueue({ kind: "reminder", url: "/boom", method: "POST", body: "{}" });
    outbox.enqueue({ kind: "reminder", url: "/never-reached", method: "POST", body: "{}" });

    const seen: string[] = [];
    const result = await outbox.replay(async (action) => {
      seen.push(action.url);
      return action.url === "/boom" ? failed() : ok();
    });

    expect(seen).toEqual(["/first", "/boom"]);
    expect(result.failedId).not.toBeNull();
    expect(result.remaining).toBe(2);
    // The failed action and everything behind it stay queued, in order.
    expect(outbox.list().map((a) => a.url)).toEqual(["/boom", "/never-reached"]);

    // A later drain resumes exactly where it stopped.
    const retry = await outbox.replay(async () => ok());
    expect(retry).toEqual({ sent: expect.any(Array), failedId: null, remaining: 0 });
    expect(outbox.size()).toBe(0);
  });

  it("treats an executor throw like a failed response", async () => {
    const outbox = createOutbox(memoryOutboxStorage());
    outbox.enqueue({ kind: "reminder", url: "/x", method: "POST", body: "{}" });
    const result = await outbox.replay(async () => {
      throw new TypeError("network down again");
    });
    expect(result.failedId).not.toBeNull();
    expect(result.remaining).toBe(1);
    expect(outbox.size()).toBe(1);
  });
});

describe("P15.4 — payments never queue", () => {
  for (const kind of ["payment", "booking", "prescription", "emergency"]) {
    it(`rejects ${kind}`, () => {
      const outbox = createOutbox(memoryOutboxStorage());
      expect(() => outbox.enqueue({ kind, url: "/pay", method: "POST", body: "{}" })).toThrow(
        `outbox_rejects_${kind}`,
      );
      expect(outbox.size()).toBe(0);
    });
  }

  it("rejects unknown kinds rather than guessing", () => {
    const outbox = createOutbox(memoryOutboxStorage());
    expect(() => outbox.enqueue({ kind: "something-new", url: "/x", method: "POST", body: "{}" })).toThrow(
      "outbox_rejects_something-new",
    );
  });
});

describe("P15.4 — replayed mutations are idempotent", () => {
  it("auto-attaches an idempotency key to a keyless mutation", () => {
    const outbox = createOutbox(memoryOutboxStorage());
    const action = outbox.enqueue({ kind: "reminder", url: "/log", method: "POST", body: "{}" });
    expect(action.idempotencyKey).toMatch(/^[0-9a-f-]{8,}/);
    expect(action.headers["idempotency-key"]).toBe(action.idempotencyKey);
  });

  it("keeps a caller-supplied key instead of minting a second one", () => {
    const outbox = createOutbox(memoryOutboxStorage());
    const action = outbox.enqueue({
      kind: "notification",
      url: "/settings",
      method: "PATCH",
      headers: { "idempotency-key": "tap-1" },
      body: "{}",
    });
    expect(action.idempotencyKey).toBe("tap-1");
    expect(Object.keys(action.headers).filter((k) => k.toLowerCase() === "idempotency-key")).toHaveLength(1);
  });

  it("does not key safe reads", () => {
    const outbox = createOutbox(memoryOutboxStorage());
    const action = outbox.enqueue({ kind: "like", url: "/likes", method: "GET" });
    expect(action.idempotencyKey).toBeNull();
  });

  it("replays with the same key when drained twice", async () => {
    const outbox = createOutbox(memoryOutboxStorage());
    outbox.enqueue({ kind: "reminder", url: "/log", method: "POST", body: "{}" });
    const keys: Array<string | null> = [];
    const executor = async (action: { headers: Record<string, string> }) => {
      keys.push(action.headers["idempotency-key"] ?? null);
      return failed();
    };
    await outbox.replay(executor);
    await outbox.replay(executor);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[0]).toBe(keys[1]);
  });
});

describe("P15.4 — storage hygiene", () => {
  it("caps the queue so a long offline stretch cannot grow it forever", () => {
    const outbox = createOutbox(memoryOutboxStorage());
    for (let i = 0; i < OUTBOX_MAX_ACTIONS + 10; i += 1) {
      outbox.enqueue({ kind: "reminder", url: `/r${i}`, method: "POST", body: "{}" }, i);
    }
    const urls = outbox.list().map((a) => a.url);
    expect(urls).toHaveLength(OUTBOX_MAX_ACTIONS);
    // Oldest dropped first: the newest actions survive.
    expect(urls[0]).toBe(`/r10`);
  });

  it("drops corrupt persisted entries instead of choking on them", () => {
    const storage = memoryOutboxStorage();
    storage.save([
      { id: "good", kind: "reminder", url: "/g", method: "POST", headers: {}, body: null, enqueuedAt: 1, idempotencyKey: "k" },
      { id: 42, kind: "reminder" },
      null,
      "junk",
    ] as never);
    const outbox = createOutbox(storage);
    expect(outbox.list().map((a) => a.id)).toEqual(["good"]);
  });

  it("remove() drops one action, clear() drops everything", () => {
    const outbox = createOutbox(memoryOutboxStorage());
    const first = outbox.enqueue({ kind: "reminder", url: "/1", method: "POST", body: null });
    outbox.enqueue({ kind: "reminder", url: "/2", method: "POST", body: null });
    outbox.remove(first.id);
    expect(outbox.list().map((a) => a.url)).toEqual(["/2"]);
    outbox.clear();
    expect(outbox.size()).toBe(0);
  });
});
