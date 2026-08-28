import { NextResponse } from "next/server";
import { z } from "zod";
import { callPatientApi } from "@/lib/api/upstream";

const requestSchema = z.object({ identifier: z.string().trim().min(3).max(320) });
const responseSchema = z.object({ requested: z.literal(true) });

export async function POST(request: Request) {
  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_password_recovery_request" }, { status: 400 });

  const upstream = await callPatientApi("/auth/password/forgot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.data),
  });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json({ message: "password_recovery_failed" }, { status: upstream.status, headers: { "cache-control": "no-store" } });

  const parsed = responseSchema.safeParse(data);
  if (!parsed.success || Object.keys(data ?? {}).some((key) => /token|secret|password/i.test(key))) {
    return NextResponse.json({ message: "unexpected_password_recovery_response" }, { status: 502, headers: { "cache-control": "no-store" } });
  }
  return NextResponse.json(parsed.data, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
