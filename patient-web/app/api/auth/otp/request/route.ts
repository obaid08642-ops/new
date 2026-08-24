import { NextResponse } from "next/server";
import { z } from "zod";
import { callPatientApi } from "@/lib/api/upstream";

const schema = z.object({ identifier: z.string().trim().min(3).max(320) });

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_otp_request" }, { status: 400 });
  const upstream = await callPatientApi("/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });
  const data = await upstream.json().catch(() => null);
  return NextResponse.json(data || { message: "otp_request_failed" }, { status: upstream.status });
}
