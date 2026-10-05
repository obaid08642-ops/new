import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieNames } from "./cookies";
import { isSafeRelativePath } from "../deep-links/nabd-links";

/** Header set by proxy.ts with the requested path + query (R18: login ?next=). */
export const REQUEST_PATH_HEADER = "x-nabd-path";

async function loginUrl(locale: string): Promise<string> {
  const path = (await headers()).get(REQUEST_PATH_HEADER);
  // Only a same-site relative page (never //host, /api, /admin) is carried over.
  if (path && isSafeRelativePath(path.split("?")[0])) return `/${locale}/login?next=${encodeURIComponent(path)}`;
  return `/${locale}/login`;
}

export async function requirePatientAccess(locale: string) {
  const accessToken = (await cookies()).get(authCookieNames.access)?.value;
  if (!accessToken) redirect(await loginUrl(locale));
  return accessToken;
}

export async function getOptionalPatientAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(authCookieNames.access)?.value;
}
