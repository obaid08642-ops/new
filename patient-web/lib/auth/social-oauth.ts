/**
 * X and Snapchat sign-in on the web mirrors the app (patient-app/src/hooks/useSocialLogin.ts codeFlow):
 * OAuth2 authorization code + PKCE (S256), the code is exchanged for an access token, and that token goes to
 * POST /auth/social-login as { provider, token }. The popup returns to /login/social-callback, which hands
 * { code, state } to the opener; the opener checks the state before anything else.
 */
export type CodeProvider = "x" | "snapchat";

export const CODE_PROVIDERS: Record<CodeProvider, { authorize: string; token: string; scope: string }> = {
  x: { authorize: "https://twitter.com/i/oauth2/authorize", token: "https://api.twitter.com/2/oauth2/token", scope: "tweet.read users.read offline.access" },
  snapchat: {
    authorize: "https://accounts.snapchat.com/accounts/oauth2/auth",
    token: "https://accounts.snapchat.com/accounts/oauth2/token",
    scope: "https://auth.snapchat.com/oauth2/api/user.display_name",
  },
};

/**
 * X and Snapchat are refused by the backend until it verifies them through the provider's own API, so their buttons
 * stay hidden unless NEXT_PUBLIC_SOCIAL_X_SNAPCHAT=1 (same gate as the app's EXPO_PUBLIC_SOCIAL_X_SNAPCHAT; session S adds
 * the backend verification and this gate is dropped afterwards).
 */
export function xSnapchatEnabled(flag: string | undefined): boolean {
  return flag === "1";
}

function base64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A random URL-safe string (RFC 7636 verifier of 43+ characters, or the state). */
export function randomUrlSafe(byteLength = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export type Pkce = { verifier: string; challenge: string; state: string };

export async function newPkce(): Promise<Pkce> {
  const verifier = randomUrlSafe(48);
  return { verifier, challenge: await codeChallenge(verifier), state: randomUrlSafe(16) };
}

export function authorizeUrl(provider: CodeProvider, clientId: string, redirectUri: string, pkce: Pkce): string {
  const { authorize, scope } = CODE_PROVIDERS[provider];
  const params = new URLSearchParams({
    response_type: "code", client_id: clientId, redirect_uri: redirectUri, scope,
    state: pkce.state, code_challenge: pkce.challenge, code_challenge_method: "S256",
  });
  return `${authorize}?${params.toString()}`;
}

/** The popup's answer is accepted only when the state is the one this tab generated. */
export function acceptCallback(expectedState: string, data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const { type, code, state } = data as { type?: unknown; code?: unknown; state?: unknown };
  if (type !== "nabd-social-callback" || typeof code !== "string" || !code || state !== expectedState) return null;
  return code;
}
