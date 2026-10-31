import { describe, expect, it, vi } from "vitest";
import { newestIncomingId, sendThreadReceipts } from "@/lib/chat/receipts";

const THREAD = "11111111-2222-3333-4444-555555555555";
const ok = (_url?: string, _init?: RequestInit) => Promise.resolve(new Response("{}", { status: 200 }));

describe("chat receipts", () => {
  it("seen goes up to the newest message the doctor sent, never the patient's own", () => {
    expect(newestIncomingId([
      { id: "a", senderRole: "provider", createdAt: "2026-10-31T10:00:00Z" },
      { id: "b", senderRole: "patient", createdAt: "2026-10-31T11:00:00Z" },
      { id: "c", senderRole: "doctor", createdAt: "2026-10-31T10:30:00Z" },
    ])).toBe("c");
    expect(newestIncomingId([{ id: "b", senderRole: "patient" }])).toBeNull();
  });

  it("posts delivered then read with up_to_message_id", async () => {
    const send = vi.fn(ok);
    expect(await sendThreadReceipts(THREAD, "m1", send as never)).toBe(true);
    expect(send.mock.calls.map((c) => c[0])).toEqual([`/api/patient/chat/threads/${THREAD}/delivered`, `/api/patient/chat/threads/${THREAD}/read`]);
    expect(JSON.parse((send.mock.calls[1][1] as RequestInit).body as string)).toEqual({ up_to_message_id: "m1" });
  });

  it("only delivered when the doctor sent nothing", async () => {
    const send = vi.fn(ok);
    await sendThreadReceipts(THREAD, null, send as never);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("a failure or a bad thread id is quiet and reports false", async () => {
    expect(await sendThreadReceipts(THREAD, "m1", (() => Promise.reject(new Error("offline"))) as never)).toBe(false);
    expect(await sendThreadReceipts("nope", "m1", vi.fn() as never)).toBe(false);
  });
});

describe("early or late join", () => {
  it("the launcher maps the 400 outside the window to not-ready, like the video page", async () => {
    const { callTokenFailure } = await import("@/lib/consult/call-session");
    expect(callTokenFailure(400, { message: "call_token_outside_appointment_window" })).toBe("not_ready");
    expect(callTokenFailure(409, "")).toBe("not_ready");
    expect(callTokenFailure(500, "")).toBe("unavailable");
  });
  it("the launcher uses that mapping", async () => {
    const src = (await import("node:fs")).readFileSync("components-next/call-token-launcher.tsx", "utf8");
    expect(src).toContain("callTokenFailure(response.status,data)");
  });
});
