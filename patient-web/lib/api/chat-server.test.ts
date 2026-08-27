import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
import { getPatientChatThreads } from "./chat-server";

describe("chat server boundary", () => {
  beforeEach(() => callPatientApi.mockReset());
  it("uses the current-patient chat thread list path and server token", async () => {
    const response = new Response(null, { status: 200 });
    callPatientApi.mockResolvedValue(response);
    await getPatientChatThreads("server-token");
    expect(callPatientApi).toHaveBeenCalledWith("/chat/threads", {}, "server-token");
  });
});
