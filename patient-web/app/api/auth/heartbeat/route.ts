import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

/** F30/Online: web presence heartbeat → backend presence (admin "online" count). */
export async function POST(req: Request) {
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });
  let client = "web";
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body.client === "string" && body.client) client = body.client.slice(0, 32);
  } catch { /* body optional */ }
  const upstream = await callPatientApi("/auth/heartbeat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client }),
  }, token);
  if (!upstream.ok) return NextResponse.json({ ok: false }, { status: upstream.status });
  return NextResponse.json(await upstream.json().catch(() => ({ ok: true })), { headers: { "cache-control": "no-store" } });
}
