import { describe, expect, it } from "vitest";
import { callStatus, parseCallHistory } from "./call-history";

// #399: TEST payloads in the shape of GET /calls/history (livekit.service.ts getCallHistory).
describe("call history", () => {
  it("maps the server's call states, a declined call and a missed one", () => {
    expect(callStatus("ENDED", null)).toBe("ended");
    expect(callStatus("FAILED", "rejected")).toBe("rejected");
    expect(callStatus("FAILED", null)).toBe("missed");
    expect(callStatus("ACTIVE", null)).toBe("active");
    expect(callStatus("INITIATED", null)).toBe("pending");
  });

  it("reads the rows as sent and drops what has no id; the duration only for a finished call", () => {
    const rows = parseCallHistory({ data: [
      { id: "c1", appointment_id: "a1", call_type: "video", status: "ENDED", started_at: "2026-10-01T10:00:00Z", duration_seconds: 125 },
      { id: "c2", call_type: "audio", status: "FAILED", end_reason: "rejected", duration_seconds: 9 },
      { call_type: "video", status: "ENDED" },
    ] });
    expect(rows).toEqual([
      { id: "c1", appointmentId: "a1", kind: "video", status: "ended", at: "2026-10-01T10:00:00Z", durationSeconds: 125 },
      { id: "c2", appointmentId: undefined, kind: "voice", status: "rejected", at: undefined, durationSeconds: undefined },
    ]);
    expect(parseCallHistory(null)).toEqual([]);
  });
});
