import { NextResponse } from "next/server";
import { z } from "zod";
import { callPatientApi } from "@/lib/api/upstream";
import { setOtpIdentifier } from "@/lib/auth/cookies";
import { isNoChannel } from "@/lib/auth/otp-flow";

const schema = z.object({ identifier: z.string().trim().min(3).max(320) });
// The backend answers {otp_sent: true, channel, expires_in} (AuthService.requestPatientOtp), the same body
// whether or not the account exists. The browser only gets {ok, expires_in} back.
const successSchema = z.object({
  otp_sent: z.literal(true),
  expires_in: z.number().int().positive().max(600),
});

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_otp_request" }, { status: 400 });

  const upstream = await callPatientApi("/auth/otp/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.data),
  });
  const data = await upstream.json().catch(() => null);
  // `otp_no_channel` (a phone-only account: the code goes by push or e-mail, never SMS) is passed on by name so the page can say so.
  if (!upstream.ok) return NextResponse.json({ message: isNoChannel(data) ? "otp_no_channel" : "otp_request_failed" }, { status: upstream.status });

  const hasTokenField = data && typeof data === "object" && !Array.isArray(data)
    && Object.keys(data as Record<string, unknown>).some((key) => /token/i.test(key));
  const parsed = successSchema.safeParse(data);
  if (hasTokenField || !parsed.success) return NextResponse.json({ message: "unexpected_otp_response" }, { status: 502 });
  const response = NextResponse.json({ ok: true, expires_in: parsed.data.expires_in }, { status: upstream.status, headers: { "cache-control": "no-store" } });
  // Sign-in with a code and a resend after the sign-up cookie expired both land on /otp, which reads this cookie.
  setOtpIdentifier(response, input.data.identifier);
  return response;
}
