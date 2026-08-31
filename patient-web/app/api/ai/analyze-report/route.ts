import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

export async function POST(request: Request) {
  const jar = await cookies();
  const accessToken = Object.values(authCookieNames).map((n) => jar.get(n)?.value).find((v) => v) ?? null;
  if (!accessToken) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const body = await request.text();
  const res = await callPatientApi("/ai/analyze-report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  }, accessToken);
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
}
