/**
 * Which social sign-in buttons the login screen draws. The BACKEND decides (GET /auth/social/config: it knows which providers it can
 * finish and holds the gates), so a release needs no rebuild per key. The NEXT_PUBLIC_* values the web used to inline at build time
 * stay only as a fallback for a backend that does not answer the endpoint (an older one).
 */
export type SocialButtons = {
  google?: { clientId: string };
  apple?: { clientId: string; redirectUri: string };
  x?: { clientId: string };
  snapchat?: { clientId: string };
};

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const record = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);

/** The answer of GET /auth/social/config. null when the payload is not that answer (so the fallback applies). */
export function parseSocialConfig(payload: unknown): SocialButtons | null {
  const root = record(payload);
  if (!root || !("google" in root || "apple" in root || "x" in root || "snapchat" in root)) return null;
  const on = (key: string) => {
    const entry = record(root[key]);
    return entry && entry.enabled === true ? entry : null;
  };
  const out: SocialButtons = {};
  const google = on("google");
  if (google && text(google.client_id)) out.google = { clientId: text(google.client_id) };
  const apple = on("apple");
  // the web Apple button needs the service id and its registered redirect URI
  if (apple && text(apple.client_id) && text(apple.redirect_uri)) out.apple = { clientId: text(apple.client_id), redirectUri: text(apple.redirect_uri) };
  const x = on("x");
  if (x && text(x.client_id)) out.x = { clientId: text(x.client_id) };
  const snapchat = on("snapchat");
  if (snapchat && text(snapchat.client_id)) out.snapchat = { clientId: text(snapchat.client_id) };
  return out;
}

/** The build-time values (the fallback). X and Snapchat were behind NEXT_PUBLIC_SOCIAL_X_SNAPCHAT=1. */
export function socialFromEnv(env: Record<string, string | undefined> = process.env): SocialButtons {
  const out: SocialButtons = {};
  if (text(env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)) out.google = { clientId: text(env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) };
  if (text(env.NEXT_PUBLIC_APPLE_CLIENT_ID) && text(env.NEXT_PUBLIC_APPLE_REDIRECT_URI)) out.apple = { clientId: text(env.NEXT_PUBLIC_APPLE_CLIENT_ID), redirectUri: text(env.NEXT_PUBLIC_APPLE_REDIRECT_URI) };
  if (env.NEXT_PUBLIC_SOCIAL_X_SNAPCHAT === "1") {
    if (text(env.NEXT_PUBLIC_X_CLIENT_ID)) out.x = { clientId: text(env.NEXT_PUBLIC_X_CLIENT_ID) };
    if (text(env.NEXT_PUBLIC_SNAPCHAT_CLIENT_ID)) out.snapchat = { clientId: text(env.NEXT_PUBLIC_SNAPCHAT_CLIENT_ID) };
  }
  return out;
}

/** The backend's answer wins whenever it answered; the build-time values apply only when it did not. */
export function resolveSocial(payload: unknown, env: Record<string, string | undefined> = process.env): SocialButtons {
  return parseSocialConfig(payload) ?? socialFromEnv(env);
}
