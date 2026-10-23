import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { assertSameOrigin } from "@/lib/api/csrf";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const schema = z.object({
  service_kind: z.enum(["lab", "radiology", "nursing"]),
  items: z.array(z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/)).min(1).max(30),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  payer: z.enum(["cash", "insurance"]),
});

/** POST /ordering/asap: starts the staged ASAP broadcast for the signed-in patient. */
export async function POST(request: Request) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_asap_payload" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/ordering/asap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "asap_failed", upstream.status);
  return NextResponse.json(data, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
