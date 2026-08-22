import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

type Context = { params: Promise<{ appointmentId: string }> };
const idSchema = z.string().uuid();
const tokenSchema = z.object({ provider: z.literal("livekit"), token: z.string().min(1).max(8192), room: z.string().min(1).max(255) }).strip();

export async function GET(_request: Request, context: Context) {
  const { appointmentId } = await context.params;
  if (!idSchema.safeParse(appointmentId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/unified-bookings/${appointmentId}/call-token`, { method: "GET" }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "call_token_unavailable" }, { status: upstream.status, headers: { "cache-control": "no-store" } });
  const parsed = tokenSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ message: "invalid_call_token_response" }, { status: 502, headers: { "cache-control": "no-store" } });
  return NextResponse.json(parsed.data, { status: 200, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
