import { authErrorKind } from "@/lib/auth/auth-errors";

/** The shortest e-mail or phone the backend and every form accept (same floor as the BFF routes). */
export const MIN_IDENTIFIER_LENGTH = 3;

/** The identifier ready to send (trimmed), or null when it is too short to be an e-mail or a phone number. */
export function usableIdentifier(text: string): string | null {
  const value = text.trim();
  return value.length >= MIN_IDENTIFIER_LENGTH ? value : null;
}

/** True when the backend refused because the account has no channel the code can be sent on (no e-mail, no signed-in device; there is no SMS). */
export function isNoChannel(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const { message, code } = body as { message?: unknown; code?: unknown };
  return message === "otp_no_channel" || code === "otp_no_channel";
}

export type CodeRequestFailure = "noChannel" | "rateLimited" | "unavailable" | "failed";

/** Why a code was not sent, from the BFF answer; `noChannel` is named so the page can say what to do instead. */
export function codeRequestFailure(status: number, body: unknown): CodeRequestFailure {
  if (isNoChannel(body)) return "noChannel";
  const kind = authErrorKind(status);
  if (kind === "rateLimited") return "rateLimited";
  if (kind === "unavailable") return "unavailable";
  return "failed";
}
