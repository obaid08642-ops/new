export type IceServer = { urls: string[]; username?: string; credential?: string };

/** The `ice_servers` of a call answer, kept only where it is the shape WebRTC takes (urls as stun/turn/turns, credentials as text); anything else is dropped. */
export function iceServersFrom(value: unknown): IceServer[] {
  if (!Array.isArray(value)) return [];
  const out: IceServer[] = [];
  for (const s of value) {
    if (!s || typeof s !== "object") continue;
    const { urls, username, credential } = s as Record<string, unknown>;
    const list = (Array.isArray(urls) ? urls : []).filter((u): u is string => typeof u === "string" && /^(stun|turn|turns):/.test(u));
    if (!list.length) continue;
    out.push({ urls: list, ...(typeof username === "string" ? { username } : {}), ...(typeof credential === "string" ? { credential } : {}) });
  }
  return out;
}
