import { describe, expect, it, vi } from "vitest";
import { classifyOpen, createScanGate, retryAfterSecondsOf, scanStateOfError, scanStateOfUpload, type ScanProbeResult } from "./scan-status";

const flush = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };

function harness(results: Array<ScanProbeResult | Error>, initial: "pending" | "ok" = "pending") {
  let clock = 0;
  const timers: Array<{ at: number; fn: () => void; handle: number }> = [];
  let id = 0;
  const probe = vi.fn(async () => { const next = results.shift() ?? { status: 423, body: {} }; if (next instanceof Error) throw next; return next; });
  const changes: string[] = [];
  const gate = createScanGate({
    probe,
    initial,
    onChange: (s) => changes.push(s),
    now: () => clock,
    setTimer: (fn, ms) => { id += 1; timers.push({ at: clock + ms, fn, handle: id }); return id; },
    clearTimer: (h) => { const i = timers.findIndex((t) => t.handle === h); if (i >= 0) timers.splice(i, 1); },
  });
  const advance = async (ms: number) => { clock += ms; for (const t of timers.filter((x) => x.at <= clock)) { timers.splice(timers.indexOf(t), 1); t.fn(); } await flush(); };
  return { gate, probe, changes, timers, advance };
}

describe("upload response", () => {
  it("pending_scan is pending, infected is rejected, anything else is ok", () => {
    expect(scanStateOfUpload({ id: "1", scan_status: "pending_scan" })).toBe("pending");
    expect(scanStateOfUpload({ data: { scan_status: "scanning" } })).toBe("pending");
    expect(scanStateOfUpload({ scan_status: "infected" })).toBe("rejected");
    expect(scanStateOfUpload({ message: "file_infected" })).toBe("rejected");
    expect(scanStateOfUpload({ id: "1" })).toBe("ok");
    expect(scanStateOfUpload(null)).toBe("ok");
  });
});

describe("scanStateOfError", () => {
  it("reads the scan states carried by a thrown message and nothing else", () => {
    expect(scanStateOfError(new Error("file_pending_scan"))).toBe("pending");
    expect(scanStateOfError(new Error("file_infected"))).toBe("rejected");
    expect(scanStateOfError(new Error("OFFLINE_ERROR"))).toBeNull();
    expect(scanStateOfError(undefined)).toBeNull();
  });
});

describe("classifyOpen", () => {
  it("423 is pending with the server's retry_after_seconds (default 60), not an error", () => {
    expect(classifyOpen(423, { code: "file_pending_scan", retry_after_seconds: 30 })).toEqual({ state: "pending", retryAfterSeconds: 30 });
    expect(classifyOpen(423, null)).toEqual({ state: "pending", retryAfterSeconds: 60 });
    expect(retryAfterSecondsOf({ retry_after_seconds: 1 })).toBe(5);
  });
  it("200 is ok; infected and a 4xx after the scan are rejected; other failures are errors", () => {
    expect(classifyOpen(200, { url: "x" })).toEqual({ state: "ok" });
    expect(classifyOpen(200, { scan_status: "infected" })).toEqual({ state: "rejected" });
    expect(classifyOpen(404, {}, true)).toEqual({ state: "rejected" });
    expect(classifyOpen(404, {}, false)).toEqual({ state: "error" });
    expect(classifyOpen(401, {}, true)).toEqual({ state: "error" });
    expect(classifyOpen(500, {}, true)).toEqual({ state: "error" });
  });
});

describe("createScanGate", () => {
  it("423 keeps pending (no change, no error) and retries after retry_after_seconds", async () => {
    const h = harness([{ status: 423, body: { retry_after_seconds: 60 } }, { status: 200 }]);
    h.gate.start(); await flush();
    expect(h.probe).toHaveBeenCalledTimes(1);
    expect(h.gate.state()).toBe("pending");
    expect(h.changes).toEqual([]);
    expect(h.timers).toHaveLength(1);
    await h.advance(59_000);
    expect(h.probe).toHaveBeenCalledTimes(1);
    await h.advance(1_000);
    expect(h.probe).toHaveBeenCalledTimes(2);
    expect(h.gate.state()).toBe("ok");
    expect(h.changes).toEqual(["ok"]);
    expect(h.timers).toHaveLength(0);
  });
  it("a focus retry probes at once, throttled", async () => {
    const h = harness([{ status: 423 }, { status: 423 }, { status: 200 }]);
    h.gate.start(); await flush();
    h.gate.refresh(); await flush();
    expect(h.probe).toHaveBeenCalledTimes(1);
    await h.advance(6_000);
    h.gate.refresh(); await flush();
    expect(h.probe).toHaveBeenCalledTimes(2);
    expect(h.timers).toHaveLength(1);
    await h.advance(6_000);
    h.gate.refresh(); await flush();
    expect(h.gate.state()).toBe("ok");
  });
  it("infected after the scan ends in rejected and stops", async () => {
    const h = harness([{ status: 423 }, { status: 200, body: { scan_status: "infected" } }]);
    h.gate.start(); await flush();
    await h.advance(60_000);
    expect(h.gate.state()).toBe("rejected");
    expect(h.timers).toHaveLength(0);
  });
  it("a 404 after the scan is rejected", async () => {
    const h = harness([{ status: 404 }]);
    h.gate.start(); await flush();
    expect(h.gate.state()).toBe("rejected");
  });
  it("a network error stays pending and tries again at the default interval, quietly", async () => {
    const h = harness([new Error("offline"), { status: 200 }]);
    h.gate.start(); await flush();
    expect(h.changes).toEqual([]);
    await h.advance(60_000);
    expect(h.gate.state()).toBe("ok");
  });
  it("stop clears the timer and nothing fires afterwards", async () => {
    const h = harness([{ status: 423 }, { status: 200 }]);
    h.gate.start(); await flush();
    h.gate.stop();
    expect(h.timers).toHaveLength(0);
    await h.advance(120_000);
    h.gate.refresh(); await flush();
    expect(h.probe).toHaveBeenCalledTimes(1);
    expect(h.changes).toEqual([]);
  });
  it("an ok file never probes", async () => {
    const h = harness([], "ok");
    h.gate.start(); h.gate.refresh(); await flush();
    expect(h.probe).not.toHaveBeenCalled();
  });
});
