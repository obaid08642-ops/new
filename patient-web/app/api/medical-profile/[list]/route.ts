import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ list: string }> };
const LISTS = ["chronic-diseases", "allergies", "surgeries", "long-term-medications"] as const;
const bodySchema = z.object({ name: z.string().trim().min(1).max(200) });

export async function POST(request: Request, context: Context) {
  const { list } = await context.params;
  if (!(LISTS as readonly string[]).includes(list)) {
    return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_item_payload" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(
    `/medical-profile/${list}`,
    { method: "POST", body: JSON.stringify({ name: parsed.data.name }) },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "profile_add_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
