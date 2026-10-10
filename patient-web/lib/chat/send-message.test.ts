import { describe, expect, it, vi } from "vitest";
import { isAllowedPatientApiRequest, isAllowedPatientApiTarget } from "../api/patient-allowlist";
import { buildChatMessage, classifySendFailure, createChatSender, MAX_MESSAGE_LENGTH } from "./send-message";

const THREAD = "91047ef2-ad36-422a-a184-629693e7c729";
const reply = (status: number) => new Response("{}", { status });

describe("the message body", () => {
  it("is the trimmed text, 1 to 2000 characters, and nothing else", () => {
    expect(buildChatMessage("  hello  ")).toEqual({ body: "hello" });
    expect(buildChatMessage("hi", "key-1")).toEqual({ body: "hi", client_message_id: "key-1" });
    expect(buildChatMessage("   ")).toBeNull();
    expect(buildChatMessage("")).toBeNull();
    expect(buildChatMessage(undefined)).toBeNull();
    expect(buildChatMessage("x".repeat(MAX_MESSAGE_LENGTH))).not.toBeNull();
    expect(buildChatMessage("x".repeat(MAX_MESSAGE_LENGTH + 1))).toBeNull();
  });
});

describe("sending", () => {
  it("posts the text through the patient proxy with an idempotency key, and says ok only after the server answered 2xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(201));
    const sender = createChatSender(fetchMock as unknown as typeof fetch, () => "key-a");
    expect(await sender.send(THREAD, " hello ")).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/patient/chat/threads/${THREAD}/messages`);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json", "idempotency-key": "key-a" });
    expect(JSON.parse(init.body)).toEqual({ body: "hello", client_message_id: "key-a" });
  });

  it("a retry after a dropped connection or a 5xx reuses the key; after a final answer the next message gets a new one", async () => {
    const keys = ["k1", "k2", "k3"];
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("down")).mockResolvedValueOnce(reply(503)).mockResolvedValueOnce(reply(201)).mockResolvedValue(reply(201));
    const sender = createChatSender(fetchMock as unknown as typeof fetch, () => keys.shift() as string);
    expect(await sender.send(THREAD, "hello")).toEqual({ ok: false, kind: "network" });
    expect(await sender.send(THREAD, "hello")).toEqual({ ok: false, kind: "network" });
    expect(await sender.send(THREAD, "hello")).toEqual({ ok: true });
    expect(await sender.send(THREAD, "hello")).toEqual({ ok: true });
    expect(fetchMock.mock.calls.map(([, init]) => init.headers["idempotency-key"])).toEqual(["k1", "k1", "k1", "k2"]);
  });

  it("names the failure the screen translates: closed or not allowed, signed out, invalid, network", async () => {
    expect(classifySendFailure(403)).toBe("forbidden");
    expect(classifySendFailure(401)).toBe("signedOut");
    expect(classifySendFailure(400)).toBe("invalid");
    expect(classifySendFailure(502)).toBe("network");
    expect(classifySendFailure(500)).toBe("generic");
    const sender = createChatSender((async () => reply(403)) as unknown as typeof fetch, () => "k");
    expect(await sender.send(THREAD, "hello")).toEqual({ ok: false, kind: "forbidden" });
  });

  it("sends nothing for an empty text or a thread id that is not a uuid, and one message at a time", async () => {
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => setTimeout(() => resolve(reply(201)), 5)));
    const sender = createChatSender(fetchMock as unknown as typeof fetch, () => "k");
    expect(await sender.send(THREAD, "   ")).toEqual({ ok: false, kind: "invalid" });
    expect(await sender.send("../admin", "hello")).toEqual({ ok: false, kind: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
    const first = sender.send(THREAD, "one");
    expect(await sender.send(THREAD, "two")).toBeNull();
    expect(await first).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("the proxy allowlist for the doctor thread composer", () => {
  it("allows exactly POST /chat/threads/:uuid/messages", () => {
    expect(isAllowedPatientApiRequest(`/chat/threads/${THREAD}/messages`, "POST")).toBe(true);
    expect(isAllowedPatientApiTarget(`/chat/threads/${THREAD}/messages`, "", "POST")).toBe(true);
  });
  it("opens no other method, thread route or id", () => {
    for (const method of ["PUT", "PATCH", "DELETE"]) expect(isAllowedPatientApiRequest(`/chat/threads/${THREAD}/messages`, method)).toBe(false);
    expect(isAllowedPatientApiRequest(`/chat/threads/${THREAD}/read`, "POST")).toBe(false);
    expect(isAllowedPatientApiRequest(`/chat/threads/${THREAD}/delivered`, "POST")).toBe(false);
    expect(isAllowedPatientApiRequest(`/chat/threads/${THREAD}`, "POST")).toBe(false);
    expect(isAllowedPatientApiRequest("/chat/threads/not-a-uuid/messages", "POST")).toBe(false);
    expect(isAllowedPatientApiRequest(`/chat/threads/${THREAD}/messages/extra`, "POST")).toBe(false);
    expect(isAllowedPatientApiRequest("/chat/messages/abc", "DELETE")).toBe(false);
  });
});
