import { NextResponse } from "next/server";
import { z } from "zod";
import { callPatientApi } from "@/lib/api/upstream";

const schema = z.object({ identifier: z.string().trim().min(3).max(320) });
const successSchema = z.object({
  ok: z.literal(true),
  expires_in: z.number().int().positive().max(600),
});

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_otp_request" }, { status: 400 });

  const upstream = await callPatientApi("/auth/otp/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.data),
  });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json({ message: "otp_request_failed" }, { status: upstream.status });

  const hasTokenField = data && typeof data === "object" && !Array.isArray(data)
    && Object.keys(data as Record<string, unknown>).some((key) => /token/i.test(key));
  const parsed = successSchema.safeParse(data);
  if (hasTokenField || !parsed.success) return NextResponse.json({ message: "unexpected_otp_response" }, { status: 502 });
  return NextResponse.json(parsed.data, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
