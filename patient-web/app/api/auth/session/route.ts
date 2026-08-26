import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

/** F-W1: strict allowlist of identity fields exposed to the browser. */
const resultSchema = {
  id: (v: unknown) => (typeof v === "string" ? v : null),
  full_name: (v: unknown) => (typeof v === "string" ? v : null),
  phone: (v: unknown) => (typeof v === "string" ? v : null),
  email: (v: unknown) => (typeof v === "string" ? v : null),
  role: (v: unknown) => (typeof v === "string" ? v : null),
  avatar_url: (v: unknown) => (typeof v === "string" ? v : null),
};

export async function GET() {
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });
  const upstream = await callPatientApi("/auth/me", { method: "GET" }, token);
  if (!upstream.ok) return NextResponse.json({ authenticated: false }, { status: upstream.status });
  const raw: any = await upstream.json().catch(() => null);
  const user: Record<string, unknown> = {};
  for (const [key, pick] of Object.entries(resultSchema)) {
    const value = pick(raw?.[key]);
    if (value !== null && value !== undefined && value !== "") user[key] = value;
  }
  return NextResponse.json(
    { authenticated: true, user },
    { headers: { "cache-control": "no-store" } },
  );
}
