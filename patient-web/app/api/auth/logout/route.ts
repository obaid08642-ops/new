import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames, clearSessionCookies } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

/** Sign out: the backend revokes this browser's refresh session (issue 440), then the session cookies are cleared. */
export async function POST() {
  const store = await cookies();
  const token = store.get(authCookieNames.access)?.value;
  const refresh = store.get(authCookieNames.refresh)?.value;
  if (token || refresh) {
    await callPatientApi(
      "/auth/logout",
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(refresh ? { refresh_token: refresh } : {}) },
      token,
    ).catch(() => undefined);
  }
  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
