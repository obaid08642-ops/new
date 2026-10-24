import { NextResponse } from "next/server";

/** The answer of the sign-in routes when the account belongs to the provider app: no session cookie is set. */
export const WRONG_APP_MESSAGE = "wrong_app";

/** The role a sign-in answer carries (`user.role` of the backend's publicUser), or null when it has none. */
export function roleOf(data: unknown): string | null {
  const user = (data as { user?: { role?: unknown } } | null)?.user;
  return typeof user?.role === "string" ? user.role : null;
}

/** True for an account that has no place in the patient area (doctor, pharmacy, lab, admin ...). A missing role is not blocked. */
export function isNonPatientRole(data: unknown): boolean {
  const role = roleOf(data);
  return role !== null && role !== "patient" && role !== "guest";
}

/** 403 {message:"wrong_app"}: the form shows the "use the provider app" page. Never call setSessionCookies before this. */
export function wrongAppResponse(): NextResponse {
  return NextResponse.json({ message: WRONG_APP_MESSAGE }, { status: 403 });
}
