import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { assertSameOrigin } from "@/lib/api/csrf";
import { callPatientApi } from "@/lib/api/upstream";

const schema = z.object({ specialty: z.string().min(1).max(120), mode: z.enum(["video", "audio"]) });

/** POST /consultations/instant: broadcasts the request to the online doctors of the specialty. The 409 no-doctor answer keeps its earliest_slot. */
export async function POST(request: Request) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_instant_payload" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/consultations/instant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    const o = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
    const message = typeof o.message === "string" && o.message.length <= 160 ? o.message : "instant_failed";
    return NextResponse.json(o.earliest_slot && typeof o.earliest_slot === "object" ? { message, earliest_slot: o.earliest_slot } : { message }, { status: upstream.status });
  }
  return NextResponse.json(data, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
