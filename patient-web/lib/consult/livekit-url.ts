/**
 * The LiveKit signalling URL the call screens connect to (video-call, room/[id]).
 *
 * Read on the server at request time (NABD_LIVEKIT_URL), so one build serves production (wss://live.nabd.plus, the
 * default) and a local stack (tools/live/start-livekit.sh, ws://127.0.0.1:7880) without rebuilding. The value is passed
 * to the client component as a prop, and the page's Content-Security-Policy allows exactly that origin (lib/security/csp.ts).
 */
export const DEFAULT_LIVEKIT_URL = "wss://live.nabd.plus";

type Env = Record<string, string | undefined>;

export function livekitUrl(env: Env = process.env): string {
  const value = (env.NABD_LIVEKIT_URL || env.NEXT_PUBLIC_LIVEKIT_URL || "").trim();
  if (!value) return DEFAULT_LIVEKIT_URL;
  try {
    const url = new URL(value);
    if (url.protocol !== "wss:" && url.protocol !== "ws:") return DEFAULT_LIVEKIT_URL;
    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_LIVEKIT_URL;
  }
}

/**
 * The connect-src entries a configured LiveKit needs beyond the default one: its WebSocket origin, and the matching
 * http(s) origin livekit-client calls to validate a failed connection. Empty for the default URL (already in the policy).
 */
export function livekitConnectSources(env: Env = process.env): string[] {
  const url = livekitUrl(env);
  if (url === DEFAULT_LIVEKIT_URL) return [];
  const { protocol, host } = new URL(url);
  return [`${protocol}//${host}`, `${protocol === "wss:" ? "https:" : "http:"}//${host}`];
}
