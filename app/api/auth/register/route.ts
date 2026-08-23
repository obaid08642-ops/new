import { NextResponse } from "next/server";
import { z } from "zod";
import { callPatientApi } from "@/lib/api/upstream";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  identifier: z.string().trim().min(3).max(320),
  password: z.string().min(8).max(128),
  locale: z.string().trim().min(2).max(12),
  consents: z.array(z.object({ policy_id: z.string().trim().min(1).max(120), version: z.string().trim().min(1).max(80) }).strict()).min(1).max(8),
}).superRefine((value, context) => {
  const keys = value.consents.map((consent) => `${consent.policy_id}:${consent.version}`);
  if (new Set(keys).size !== keys.length) context.addIssue({ code: "custom", path: ["consents"], message: "duplicate_consent" });
});
const successSchema = z.object({ registered: z.literal(true) });
const hasConfiguredConsents = () => Boolean(process.env.NABD_TERMS_POLICY_ID && process.env.NABD_TERMS_POLICY_VERSION && process.env.NABD_PRIVACY_POLICY_ID && process.env.NABD_PRIVACY_POLICY_VERSION);

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_registration" }, { status: 400, headers: { "cache-control": "no-store" } });
  if (!hasConfiguredConsents()) return NextResponse.json({ message: "registration_policy_configuration_missing" }, { status: 503, headers: { "cache-control": "no-store" } });
  const body = input.data;
  const upstream = await callPatientApi("/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json({ message: "registration_failed" }, { status: upstream.status, headers: { "cache-control": "no-store" } });
  const hasTokenField = data && typeof data === "object" && !Array.isArray(data) && Object.keys(data as Record<string, unknown>).some((key) => /token|secret|password/i.test(key));
  const parsed = successSchema.safeParse(data);
  if (hasTokenField || !parsed.success) return NextResponse.json({ message: "unexpected_registration_response" }, { status: 502, headers: { "cache-control": "no-store" } });
  return NextResponse.json(parsed.data, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
