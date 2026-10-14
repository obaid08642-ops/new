/**
 * The readable "who is signed in" hint (issue 363). The real session lives in HttpOnly cookies the browser code cannot see,
 * so every page used to ask GET /api/auth/session. This second cookie is NOT HttpOnly and holds no token: only the patient
 * id (not a secret: the patient's own id) and whether the account is a guest, or "n" for "asked, nobody is signed in".
 * The server sets it next to the session cookies (and clears it with them); the client reads it instead of the request.
 * It is a convenience for the UI (which cart to show); the server never trusts it.
 */
export const SESSION_HINT_COOKIE = "nabd_session_hint";
export const SESSION_HINT_MAX_AGE = 60 * 60 * 24 * 14;

export type SessionHint = { kind: "anonymous" } | { kind: "user"; id: string; isGuest: boolean };

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function serializeSessionHint(hint: SessionHint): string {
  return hint.kind === "anonymous" ? "n" : `${hint.isGuest ? "g" : "p"}.${hint.id}`;
}

export function parseSessionHint(value: string | null | undefined): SessionHint | null {
  if (!value) return null;
  if (value === "n") return { kind: "anonymous" };
  const match = /^([gp])\.(.+)$/.exec(value);
  if (!match || !ID_PATTERN.test(match[2])) return null;
  return { kind: "user", id: match[2], isGuest: match[1] === "g" };
}

/** Reads `sub` and `is_guest` from an access token's payload WITHOUT verifying it: the hint is a UI convenience, the server still checks every token. */
export function hintFromAccessToken(accessToken: string): SessionHint | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as { sub?: unknown; id?: unknown; is_guest?: unknown };
    const raw = json.sub ?? json.id;
    const id = typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : "";
    return ID_PATTERN.test(id) ? { kind: "user", id, isGuest: json.is_guest === true } : null;
  } catch {
    return null;
  }
}

/** Browser side: the hint in `document.cookie`, or null when there is none (an older session, or cookies cleared). */
export function readSessionHintFromDocument(): SessionHint | null {
  if (typeof document === "undefined") return null;
  try {
    for (const part of document.cookie.split(";")) {
      const [name, ...rest] = part.trim().split("=");
      if (name === SESSION_HINT_COOKIE) return parseSessionHint(decodeURIComponent(rest.join("=")));
    }
  } catch { /* unreadable cookies: ask the server */ }
  return null;
}
