import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

export async function GET(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(ref)) return NextResponse.json({ message: "invalid_ref" }, { status: 400 });
  const jar = await cookies();
  const names: string[] = Array.isArray(authCookieNames) ? (authCookieNames as unknown as string[]) : Object.values(authCookieNames as Record<string, string>);
  const token = names.map((n) => jar.get(n)?.value).find((v) => v) ?? null;
  if (!token) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const res = await callPatientApi(`/payments/status/${encodeURIComponent(ref)}`, {}, token);
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
}
