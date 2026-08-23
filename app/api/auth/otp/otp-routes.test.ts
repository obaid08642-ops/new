import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn() }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));

import { POST as requestOtp } from "./request/route";
import { POST as verifyOtp } from "./verify/route";
import { POST as exchangeSession } from "../session/exchange/route";

function jsonRequest(path: string, body: unknown, headers?: HeadersInit) { return new Request(`https://web.test${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }); }

describe("patient OTP BFF routes", () => {
  it("forwards a valid request and rejects malformed identifiers", async () => {
    state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, expires_in: 300 }), { status: 201 }));
    const response = await requestOtp(jsonRequest("/api/auth/otp/request", { identifier: "patient@example.com" }));
    expect(response.status).toBe(201); expect(state.callPatientApi).toHaveBeenCalledWith("/auth/otp/request", expect.objectContaining({ method: "POST" }));
    expect((await requestOtp(jsonRequest("/api/auth/otp/request", { identifier: "x" }))).status).toBe(400);
  });
  it("accepts only the verified shape and rewrites the exchange cookie path", async () => {
    state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, expires_in: 60, exchangeToken: "must-not-leak" }), { status: 201, headers: { "set-cookie": "nabd_otp_exchange=secret; Path=/api/v1/auth/session/exchange; HttpOnly; Secure; SameSite=Strict" } }));
    const response = await verifyOtp(jsonRequest("/api/auth/otp/verify", { identifier: "patient@example.com", code: "123456" }));
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ ok: true, expires_in: 60 });
    expect(response.headers.get("set-cookie")).toContain("Path=/api/auth/session/exchange");
    expect(response.headers.get("set-cookie")).not.toContain("must-not-leak");
  });
  it("moves a body exchange_token into an httpOnly exchange cookie without returning it", async () => {
    state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, expires_in: 60, exchange_token: "one-time-secret" }), { status: 201 }));
    const response = await verifyOtp(jsonRequest("/api/auth/otp/verify", { identifier: "patient@example.com", code: "123456" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, expires_in: 60 });
    expect(response.headers.get("set-cookie")).toContain("nabd_otp_exchange=one-time-secret");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=60");
    expect(response.headers.get("set-cookie")).not.toContain("Path=/api/v1");

  });
  it("rejects a successful upstream response that contains neither an exchange cookie nor token", async () => {
    state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, expires_in: 60 }), { status: 201 }));
    const response = await verifyOtp(jsonRequest("/api/auth/otp/verify", { identifier: "patient@example.com", code: "123456" }));
    expect(response.status).toBe(502);
  });
  it("sends only the exchange cookie upstream and never returns token-shaped data", async () => {
    state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: true, token: "must-not-leak" }), { status: 201, headers: { "set-cookie": "nabd_admin_token=secret; Path=/api/v1; HttpOnly; Secure" } }));
    const response = await exchangeSession(new Request("https://web.test/api/auth/session/exchange", { method: "POST", headers: { cookie: "nabd_otp_exchange=secret; unrelated=drop", "x-nabd-device-id": "device-test" } }));
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ authenticated: true });
    expect(state.callPatientApi).toHaveBeenCalledWith("/auth/session/exchange", expect.objectContaining({ headers: expect.objectContaining({ cookie: "nabd_otp_exchange=secret", "x-device-id": "device-test" }) }));
    expect(response.headers.get("set-cookie")).toContain("Path=/");
  });
  it("requires the one-time exchange cookie", async () => {
    expect((await exchangeSession(new Request("https://web.test/api/auth/session/exchange", { method: "POST" }))).status).toBe(400);
  });
});
