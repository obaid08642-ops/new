import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieNames } from "./cookies";

export async function requirePatientAccess(locale: string) {
  const accessToken = (await cookies()).get(authCookieNames.access)?.value;
  if (!accessToken) redirect(`/${locale}/login`);
  return accessToken;
}
