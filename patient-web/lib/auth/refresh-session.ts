import { cookies } from "next/headers";
import { authCookieNames } from "@/lib/auth/cookies";
import { parseRefreshedTokens, refreshRequestBody } from "@/lib/auth/refresh";
import { callPatientApi } from "@/lib/api/upstream";

/** Trades the refresh cookie for a new token pair; null when there is nothing to refresh with or the server refuses. */
export async function refreshSession() {
  const store = await cookies();
  const refreshToken = store.get(authCookieNames.refresh)?.value;
  const deviceId = store.get(authCookieNames.device)?.value;
  if (!refreshToken || !deviceId) return null;
  const response = await callPatientApi("/auth/refresh", { method: "POST", headers: { "content-type": "application/json", "x-device-id": deviceId }, body: refreshRequestBody(refreshToken) });
  if (!response.ok) return null;
  const tokens = parseRefreshedTokens(await response.json().catch(() => null));
  if (!tokens) return null;
  return { tokens, deviceId };
}
