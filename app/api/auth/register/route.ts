import { NextResponse } from "next/server";
import { z } from "zod";
import { callPatientApi } from "@/lib/api/upstream";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/),
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(128),
  confirm_password: z.string().min(8).max(128),
  agreed_to_terms: z.literal(true),
}).refine((value) => value.password === value.confirm_password, { path: ["confirm_password"], message: "password_mismatch" });
const successSchema = z.object({ ok: z.literal(true), requires_otp: z.literal(true).optional() });

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_registration" }, { status: 400 });
  const { confirm_password: _confirmPassword, ...body } = input.data;
  const upstream = await callPatientApi("/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json({ message: "registration_failed" }, { status: upstream.status });
  const hasTokenField = data && typeof data === "object" && !Array.isArray(data) && Object.keys(data as Record<string, unknown>).some((key) => /token|secret|password/i.test(key));
  const parsed = successSchema.safeParse(data);
  if (hasTokenField || !parsed.success) return NextResponse.json({ message: "unexpected_registration_response" }, { status: 502 });
  return NextResponse.json(parsed.data, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
