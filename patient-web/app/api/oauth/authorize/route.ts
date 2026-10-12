import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { assertSameOrigin } from "@/lib/api/csrf";
import { decideAgentConsent, pickAuthorizeParams } from "@/lib/api/agent-oauth-server";
import { isLocale } from "@/lib/i18n";

/**
 * AC-1: the consent form posts here. The patient's session goes to the backend, which validates
 * the request again and returns where the browser goes (the client's registered redirect with a
 * code, or error=access_denied). An invalid request is never redirected to the client.
 */
export async function POST(request: Request) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ message: "invalid_consent_payload" }, { status: 400 });
  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const decision = fields.decision === "approve" ? "approve" : fields.decision === "deny" ? "deny" : null;
  const locale = typeof fields.locale === "string" && isLocale(fields.locale) ? fields.locale : "ar";
  if (!decision) return NextResponse.json({ message: "invalid_consent_payload" }, { status: 400 });

  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.redirect(new URL(`/${locale}/login`, request.url), 303);

  const params = pickAuthorizeParams(fields);
  const upstream = await decideAgentConsent(token, params, decision);
  const data = await upstream.json().catch(() => null);
  const target = typeof data?.redirect_to === "string" ? data.redirect_to : null;
  if (!upstream.ok || !target) {
    const back = new URL(`/${locale}/oauth/authorize`, request.url);
    for (const [k, v] of Object.entries(params)) back.searchParams.set(k, v as string);
    return NextResponse.redirect(back, 303);
  }
  return NextResponse.redirect(target, { status: 303, headers: { "Cache-Control": "no-store" } });
}
