import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

export async function POST(request: Request) {
  const jar = await cookies();
  const names: string[] = Array.isArray(authCookieNames) ? (authCookieNames as unknown as string[]) : Object.values(authCookieNames as Record<string, string>);
  const token = names.map((n) => jar.get(n)?.value).find((v) => v) ?? null;
  if (!token) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const body = await request.text();
  const idem = request.headers.get("idempotency-key") ?? "";
  const res = await callPatientApi("/patient-ux/review", {
    method: "POST",
    headers: { "content-type": "application/json", ...(idem ? { "idempotency-key": idem } : {}) },
    body,
  }, token);
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
}
