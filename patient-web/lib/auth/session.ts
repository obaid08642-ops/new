import { cookies, headers } from "next/headers";
import { safeNextPath } from "./safe-next";
import { redirect } from "next/navigation";
import { authCookieNames } from "./cookies";

export async function requirePatientAccess(locale: string) {
  const accessToken = (await cookies()).get(authCookieNames.access)?.value;
  if (!accessToken) {
    const next = safeNextPath((await headers()).get("x-nabd-path"));
    redirect(next ? `/${locale}/login?next=${encodeURIComponent(next)}` : `/${locale}/login`);
  }
  return accessToken;
}

export async function getOptionalPatientAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(authCookieNames.access)?.value;
}
