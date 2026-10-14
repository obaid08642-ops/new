import { describe, expect, it } from "vitest";
import { reminderLogRequest } from "./reminder-log-request";

describe("reminderLogRequest (Q11)", () => {
  it("sends the idempotency key the backend requires, and the dose payload the BFF schema accepts", () => {
    const [url, init] = reminderLogRequest("r/1", "08:00", "k-1");
    expect(url).toBe("/api/health/reminders/r%2F1/log");
    expect((init.headers as Record<string, string>)["idempotency-key"]).toBe("k-1");
    expect(JSON.parse(String(init.body))).toEqual({ status: "taken", time_key: "08:00" });
  });
  it("uses a fresh key per press", () => {
    const a = reminderLogRequest("r", undefined)[1].headers as Record<string, string>;
    const b = reminderLogRequest("r", undefined)[1].headers as Record<string, string>;
    expect(a["idempotency-key"]).not.toBe(b["idempotency-key"]);
  });
});
