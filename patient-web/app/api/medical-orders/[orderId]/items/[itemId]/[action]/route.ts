import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

/**
 * M6 Ord20/21: the Order button (action "order": the backend returns the prefill and the patient goes on to the group's
 * flow) and "later" (action "defer": the item stays unordered). The form posts `next`, a path on this site only.
 */
type Context = { params: Promise<{ orderId: string; itemId: string; action: string }> };
const ID = /^[A-Za-z0-9-]{8,64}$/;

function safeNext(value: FormDataEntryValue | null, request: Request): URL | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return new URL(value, request.url);
}

export async function POST(request: Request, context: Context) {
  const { orderId, itemId, action } = await context.params;
  const form = await request.formData().catch(() => null);
  const back = safeNext(form?.get("next") ?? null, request);
  if (!back) return NextResponse.json({ message: "invalid_next" }, { status: 400 });
  if (!ID.test(orderId) || !ID.test(itemId) || (action !== "order" && action !== "defer")) return NextResponse.redirect(back, 303);
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const groupAll = form?.get("group_all") === "1";
  const upstream = await callPatientApi(
    `/medical-orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/${action}`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(action === "order" ? { group_all: groupAll } : {}), cache: "no-store" },
    token,
  );
  if (!upstream.ok) {
    const failed = new URL(back.pathname, request.url);
    failed.searchParams.set("error", "1");
    return NextResponse.redirect(failed, 303);
  }
  if (action === "defer") return NextResponse.redirect(back, 303);
  // Order: the prefill is handed to the group's flow by the redirect target; the flow does not read it yet (needs-review).
  return NextResponse.redirect(back, 303);
}
