import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { BOOKING_FOR_COOKIE, BOOKING_FOR_MAX_AGE } from "@/lib/consult/booking-for";

const bodySchema = z.object({ ref: z.string().regex(/^[a-f0-9]{32}$/) }).strict();
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

/** Book the next consultation for a family member: remembers the member's opaque reference (the booking page checks it against the family list). */
export async function POST(request: Request) {
  const store = await cookies();
  if (!store.get(authCookieNames.access)?.value) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_member" }, { status: 400 });
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(BOOKING_FOR_COOKIE, input.data.ref, { ...cookieOptions, maxAge: BOOKING_FOR_MAX_AGE });
  return response;
}

/** Back to booking for the person signed in. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(BOOKING_FOR_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
