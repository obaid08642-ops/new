import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
export async function GET() { const token = (await cookies()).get(authCookieNames.access)?.value; if (!token) return NextResponse.json({ authenticated: false }, { status: 401 }); const upstream = await callPatientApi("/auth/me", { method: "GET" }, token); if (!upstream.ok) return NextResponse.json({ authenticated: false }, { status: upstream.status }); return NextResponse.json({ authenticated: true, user: await upstream.json() }, { headers: { "cache-control": "no-store" } }); }
