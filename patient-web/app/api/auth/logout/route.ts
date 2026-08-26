import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames, clearSessionCookies } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { assertSameOrigin } from "@/lib/api/csrf";
export async function POST(requestForCsrf?: Request) {
  { const csrf = requestForCsrf ? assertSameOrigin(requestForCsrf as any) : null; if (csrf) return csrf; } const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const response = NextResponse.json({ success: true }); clearSessionCookies(response); return response; }
