import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

/** VAPID public key for browser push subscription (safe to expose upstream). */
export async function GET() {
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/push/web/vapid-key", {}, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "vapid_key_unavailable" }, { status: upstream.status });
  return NextResponse.json(data, { status: 200, headers: { "cache-control": "no-store" } });
}
