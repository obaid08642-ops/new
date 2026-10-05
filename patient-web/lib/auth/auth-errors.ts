/**
 * What an auth request's HTTP status means to the person, so a throttled or failing request is never reported as
 * "those details don't match". The BFF passes the backend status through (login, register, otp, password routes).
 */
export type AuthErrorKind = "badRequest" | "unauthorized" | "forbidden" | "notFound" | "conflict" | "gone" | "rateLimited" | "unavailable" | "server";

export function authErrorKind(status: number): AuthErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  if (status === 410) return "gone";
  if (status === 429) return "rateLimited";
  if (status === 503 || status === 504) return "unavailable";
  if (status >= 500) return "server";
  return "badRequest";
}
