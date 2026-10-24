import { NextResponse } from "next/server";
import { z } from "zod";
import { otpIdentifierCookie } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { guestMergeHeaders } from "@/lib/auth/guest-merge";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  identifier: z.string().trim().min(3).max(320),
  password: z.string().min(10).max(128),
  locale: z.string().trim().min(2).max(12),
  consents: z.array(z.object({ policy_id: z.string().trim().min(1).max(120), version: z.string().trim().min(1).max(80) }).strict()).min(1).max(8),
}).superRefine((value, context) => {
  const keys = value.consents.map((consent) => `${consent.policy_id}:${consent.version}`);
  if (new Set(keys).size !== keys.length) context.addIssue({ code: "custom", path: ["consents"], message: "duplicate_consent" });
});
const successSchema = z.object({ registered: z.literal(true), otp_sent: z.boolean().optional() });
/**
 * The consents the backend checks at sign-up (D-38): patient_terms and privacy_policy at their CURRENT versions
 * (GET /legal/policies, public). The person ticked the box in the form; the server attaches what they accepted, so a
 * changed policy version or a built-in id never makes sign-up fail (issue 432). With no policy configured at all the
 * backend skips the check, and the two keys are sent at v1. Null: policies exist but neither required one does.
 */
async function currentConsents(): Promise<Array<{ policy_id: string; version: string }> | null> {
  const upstream = await callPatientApi("/legal/policies", { cache: "no-store" });
  if (!upstream.ok) return null;
  const data: unknown = await upstream.json().catch(() => null);
  const list = Array.isArray(data) ? data : Array.isArray((data as { data?: unknown })?.data) ? (data as { data: unknown[] }).data : [];
  const pick = (key: string) => list.find((p): p is { key: string; version: string } =>
    !!p && typeof p === "object" && (p as { key?: unknown }).key === key && typeof (p as { version?: unknown }).version === "string"
    && (p as { requires_acceptance?: unknown }).requires_acceptance !== false);
  const chosen = ["patient_terms", "privacy_policy"].map(pick).filter((p): p is { key: string; version: string } => !!p).map((p) => ({ policy_id: p.key, version: p.version }));
  if (chosen.length) return chosen;
  return list.length ? null : [{ policy_id: "patient_terms", version: "v1" }, { policy_id: "privacy_policy", version: "v1" }];
}

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_registration" }, { status: 400, headers: { "cache-control": "no-store" } });
  const consents = await currentConsents();
  if (!consents) {
    return NextResponse.json({ message: "registration_policy_configuration_missing" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  const body = { ...input.data, consents };
  const upstream = await callPatientApi("/auth/register", { method: "POST", headers: await guestMergeHeaders({ "content-type": "application/json" }), body: JSON.stringify(body) });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json({ message: "registration_failed" }, { status: upstream.status, headers: { "cache-control": "no-store" } });
  const hasTokenField = data && typeof data === "object" && !Array.isArray(data) && Object.keys(data as Record<string, unknown>).some((key) => /token|secret|password/i.test(key));
  const parsed = successSchema.safeParse(data);
  if (hasTokenField || !parsed.success) return NextResponse.json({ message: "unexpected_registration_response" }, { status: 502, headers: { "cache-control": "no-store" } });
  const response = NextResponse.json(parsed.data, { status: upstream.status, headers: { "cache-control": "no-store" } });
  // The /otp page names where the code went. It reads this short-lived server-set cookie, so the e-mail address or phone
  // number never travels in a URL (history, server logs, Referer).
  response.cookies.set(otpIdentifierCookie, body.identifier, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 15 * 60 });
  return response;
}
