import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn() }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));

import { POST } from "./route";

// Shape of the real backend answer: AuthController.patientSessionExchange returns {authenticated: true} and sets
// nabd_patient_access / nabd_patient_refresh with res.cookie() (Express format).
function upstreamSuccess() {
  const headers = new Headers();
  headers.append("set-cookie", "nabd_patient_access=access.jwt.value; Max-Age=3600; Path=/; Expires=Mon, 05 Oct 2026 20:00:00 GMT; HttpOnly; SameSite=Strict");
  headers.append("set-cookie", "nabd_patient_refresh=refresh.jwt.value; Max-Age=1209600; Path=/; Expires=Mon, 19 Oct 2026 19:00:00 GMT; HttpOnly; SameSite=Strict");
  return new Response(JSON.stringify({ authenticated: true }), { status: 201, headers });
}

function exchangeRequest(cookie?: string) {
  return new Request("https://web.test/api/auth/session/exchange", { method: "POST", headers: cookie ? { cookie } : {} });
}

describe("POST /api/auth/session/exchange", () => {
  beforeEach(() => state.callPatientApi.mockReset());

  it("is refused without the one-time exchange cookie and never calls the backend", async () => {
    expect((await POST(exchangeRequest())).status).toBe(400);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });

  it("sends the token from the cookie in the JSON body the backend validates", async () => {
    state.callPatientApi.mockResolvedValueOnce(upstreamSuccess());
    await POST(exchangeRequest("nabd_otp_exchange=one-time-token"));
    const [path, init] = state.callPatientApi.mock.calls[0];
    expect(path).toBe("/auth/session/exchange");
    expect(JSON.parse(init.body)).toEqual({ exchange_token: "one-time-token" });
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
    expect(new Headers(init.headers).get("cookie")).toBeNull();
  });

  it("re-issues the backend session cookies as the nabd_access / nabd_refresh cookies the web reads", async () => {
    state.callPatientApi.mockResolvedValueOnce(upstreamSuccess());
    const response = await POST(exchangeRequest("nabd_otp_exchange=one-time-token"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: true });
    expect(response.cookies.get("nabd_access")?.value).toBe("access.jwt.value");
    expect(response.cookies.get("nabd_refresh")?.value).toBe("refresh.jwt.value");
    expect(response.cookies.get("nabd_device")?.value).toBeTruthy();
    const raw = response.headers.getSetCookie().join("\n");
    expect(raw).not.toContain("nabd_patient_access");
    expect(raw).toContain("nabd_otp_exchange=;");
    expect(raw).toContain("HttpOnly");
  });

  it("keeps the browser's device id", async () => {
    state.callPatientApi.mockResolvedValueOnce(upstreamSuccess());
    const response = await POST(exchangeRequest("nabd_otp_exchange=one-time-token; nabd_device=device-1"));
    expect(response.cookies.get("nabd_device")?.value).toBe("device-1");
  });

  it("passes an invalid or used token through as its status and clears the exchange cookie", async () => {
    state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ message: "exchange_token_invalid", code: "exchange_token_invalid", statusCode: 401 }), { status: 401 }));
    const response = await POST(exchangeRequest("nabd_otp_exchange=used"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "exchange_token_invalid" });
    expect(response.cookies.get("nabd_access")).toBeUndefined();
    expect(response.headers.getSetCookie().join("\n")).toContain("nabd_otp_exchange=;");
  });

  it("answers 502 when the backend succeeds without both session cookies", async () => {
    state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: true }), { status: 201 }));
    expect((await POST(exchangeRequest("nabd_otp_exchange=t"))).status).toBe(502);
  });

  it("answers 502 for a body that is not {authenticated: true}", async () => {
    state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    expect((await POST(exchangeRequest("nabd_otp_exchange=t"))).status).toBe(502);
  });
});
