import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames, clearSessionCookies } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const response = NextResponse.json({ success: true }); clearSessionCookies(response); return response; }
