import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames, otpIdentifierCookie, setSessionCookies } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

const exchangeSchema = z.object({ authenticated: z.literal(true) });
// The backend (AuthController.patientSessionExchange) answers {authenticated: true} and puts the session in two
// HttpOnly cookies named like this. The web app reads nabd_access / nabd_refresh, so the BFF re-issues them.
const upstreamCookieNames = { access: "nabd_patient_access", refresh: "nabd_patient_refresh" } as const;

function cookieValue(setCookies: string[], name: string) {
  for (const line of setCookies) {
    const first = line.split(";")[0] ?? "";
    const eq = first.indexOf("=");
    if (eq > 0 && first.slice(0, eq).trim() === name) {
      const value = first.slice(eq + 1).trim();
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

function incomingCookie(request: Request, name: string) {
  const match = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function clearExchangeCookie(response: NextResponse, done = false) {
  response.cookies.set("nabd_otp_exchange", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/auth/session/exchange", maxAge: 0 });
  // Only a finished sign-in forgets where the code went: after a bad or used token the person may still ask for a new code.
  if (done) response.cookies.set(otpIdentifierCookie, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}

export async function POST(request: Request) {
  const exchangeToken = incomingCookie(request, "nabd_otp_exchange");
  if (!exchangeToken) return NextResponse.json({ message: "otp_exchange_required" }, { status: 400 });

  // The backend wants the token in the JSON body (PatientSessionExchangeDto), not as a cookie.
  const upstream = await callPatientApi("/auth/session/exchange", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ exchange_token: exchangeToken }),
  });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    const message = data && typeof data === "object" && typeof (data as { message?: unknown }).message === "string" ? (data as { message: string }).message : "";
    return clearExchangeCookie(NextResponse.json({ message: message && message.length <= 160 ? message : "session_exchange_failed" }, { status: upstream.status }));
  }
  if (!exchangeSchema.safeParse(data).success) return NextResponse.json({ message: "unexpected_session_response" }, { status: 502 });

  const setCookies = upstream.headers.getSetCookie();
  const accessToken = cookieValue(setCookies, upstreamCookieNames.access);
  const refreshToken = cookieValue(setCookies, upstreamCookieNames.refresh);
  if (!accessToken || !refreshToken) return NextResponse.json({ message: "unexpected_session_response" }, { status: 502 });

  const response = clearExchangeCookie(NextResponse.json({ authenticated: true }, { status: 200, headers: { "cache-control": "no-store" } }), true);
  setSessionCookies(response, { accessToken, refreshToken }, incomingCookie(request, authCookieNames.device) || request.headers.get("x-nabd-device-id") || crypto.randomUUID());
  return response;
}
