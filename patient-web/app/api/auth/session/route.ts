import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

/**
 * "Is there a session?" probe. Not being signed in is an ANSWER here, not an error: it is 200 with
 * `authenticated: false`, so a page that only asks (the register form, to spot a guest) leaves no failed
 * request in the browser console. Any other upstream failure still passes its status through.
 */
export async function GET() {
  const headers = { "cache-control": "no-store" };
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { headers });
  const upstream = await callPatientApi("/auth/me", { method: "GET" }, token);
  if (upstream.status === 401) return NextResponse.json({ authenticated: false }, { headers });
  if (!upstream.ok) return NextResponse.json({ authenticated: false }, { status: upstream.status, headers });
  return NextResponse.json({ authenticated: true, user: await upstream.json() }, { headers });
}
