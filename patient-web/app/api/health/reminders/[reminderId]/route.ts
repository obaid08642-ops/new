import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ reminderId: string }> };
const idSchema = z.string().min(1).max(128);

async function tokenOr401() {
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  return accessToken || null;
}

/** F69: edit a medication reminder (same endpoint as the app). */
export async function PATCH(req: Request, context: Context) {
  const { reminderId } = await context.params;
  if (!idSchema.safeParse(reminderId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const accessToken = await tokenOr401();
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const idempotencyKey = req.headers.get("idempotency-key")?.trim() || "";
  const upstream = await callPatientApi(`/health/reminders/${encodeURIComponent(reminderId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}) },
    body: JSON.stringify(body || {}),
  }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "reminder_update_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}

/** F69: delete a medication reminder (same endpoint as the app). */
export async function DELETE(req: Request, context: Context) {
  const { reminderId } = await context.params;
  if (!idSchema.safeParse(reminderId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const accessToken = await tokenOr401();
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const idempotencyKey = req.headers.get("idempotency-key")?.trim() || "";
  const upstream = await callPatientApi(`/health/reminders/${encodeURIComponent(reminderId)}`, {
    method: "DELETE",
    ...(idempotencyKey ? { headers: { "idempotency-key": idempotencyKey } } : {}),
  }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "reminder_delete_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
