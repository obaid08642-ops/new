import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { authCookieNames, clearSessionCookies, setSessionCookies } from "@/lib/auth/cookies";
import { parseRefreshedTokens, refreshRequestBody } from "@/lib/auth/refresh";
import { isAllowedPatientApiRequest } from "@/lib/api/patient-allowlist";
import { forwardApiResponse } from "@/lib/api/response";
import { callPatientApi } from "@/lib/api/upstream";
type Context = { params: Promise<{ path: string[] }> };
async function refreshSession() { const store = await cookies(); const refreshToken = store.get(authCookieNames.refresh)?.value; const deviceId = store.get(authCookieNames.device)?.value; if (!refreshToken || !deviceId) return null; const response = await callPatientApi("/auth/refresh", { method: "POST", headers: { "content-type": "application/json", "x-device-id": deviceId }, body: refreshRequestBody(refreshToken) }); if (!response.ok) return null; const tokens = parseRefreshedTokens(await response.json().catch(() => null)); if (!tokens) return null; return { tokens, deviceId }; }
async function proxy(request: NextRequest, context: Context) {
  const { path: parts } = await context.params;
  const path = `/${parts.map(encodeURIComponent).join("/")}`;
  if (!isAllowedPatientApiRequest(path, request.method)) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });

  const isMutation = request.method === "POST" || request.method === "PATCH";
  const headers = new Headers();
  let body: string | undefined;
  if (isMutation) {
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
    headers.set("idempotency-key", idempotencyKey);
    body = await request.text();
    if (body) {
      if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return NextResponse.json({ message: "json_body_required" }, { status: 415 });
      try { JSON.parse(body); } catch { return NextResponse.json({ message: "invalid_json_body" }, { status: 400 }); }
      headers.set("content-type", "application/json");
    }
  }

  const store = await cookies();
  let token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const target = `${path}${request.nextUrl.search}`;
  const init = { method: request.method, headers, body };
  let upstream = await callPatientApi(target, init, token);
  let rotated: Awaited<ReturnType<typeof refreshSession>> = null;
  if (upstream.status === 401) {
    rotated = await refreshSession();
    if (rotated) { token = rotated.tokens.accessToken; upstream = await callPatientApi(target, init, token); }
  }
  const response = await forwardApiResponse(upstream);
  if (rotated) setSessionCookies(response, rotated.tokens, rotated.deviceId);
  if (upstream.status === 401 && !rotated) clearSessionCookies(response);
  return response;
}
export const GET = proxy; export const POST = proxy; export const PUT = proxy; export const PATCH = proxy; export const DELETE = proxy;
