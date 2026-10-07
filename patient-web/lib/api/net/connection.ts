/**
 * P15.4 — what the network is like right now, from the browser's own
 * `navigator.connection` (Network Information API), guarded for SSR and for
 * browsers that do not implement it (Safari, Firefox: `connection` is
 * undefined, and everything reports "unknown, assume fine").
 *
 * Two consumers: images drop quality on slow links, and calls start
 * audio-only instead of failing to establish video.
 */

export type EffectiveConnectionType = "slow-2g" | "2g" | "3g" | "4g" | "unknown";

export type ConnectionQuality = {
  effectiveType: EffectiveConnectionType;
  saveData: boolean;
  /** True when the link is metered-slow or the user asked to save data. */
  slow: boolean;
  rttMs: number | null;
};

type NavigatorConnection = {
  effectiveType?: string;
  saveData?: boolean;
  rtt?: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function readConnection(): NavigatorConnection | null {
  try {
    if (typeof navigator === "undefined") return null;
    const connection = (navigator as { connection?: NavigatorConnection }).connection;
    return connection ?? null;
  } catch {
    return null;
  }
}

const SLOW_TYPES: ReadonlyArray<string> = ["slow-2g", "2g"];

export function getConnectionQuality(): ConnectionQuality {
  const connection = readConnection();
  const effectiveType = (connection?.effectiveType ?? "unknown") as EffectiveConnectionType;
  const saveData = connection?.saveData === true;
  const slow = SLOW_TYPES.includes(effectiveType) || saveData;
  const rttMs = typeof connection?.rtt === "number" && Number.isFinite(connection.rtt) ? connection.rtt : null;
  return { effectiveType, saveData, slow, rttMs };
}

export type ConnectionListener = (quality: ConnectionQuality) => void;

export function subscribeConnection(listener: ConnectionListener): () => void {
  const connection = readConnection();
  if (!connection?.addEventListener) return () => {};
  const sync = () => listener(getConnectionQuality());
  connection.addEventListener("change", sync);
  return () => connection.removeEventListener?.("change", sync);
}

/** next/image quality: full on decent links, visibly cheaper on slow ones. */
export const IMAGE_QUALITY = { full: 75, low: 50 } as const;

export function imageQualityFor(quality: ConnectionQuality): number {
  return quality.slow ? IMAGE_QUALITY.low : IMAGE_QUALITY.full;
}

/** Calls start audio-only on slow links instead of failing to establish video. */
export function shouldStartAudioOnly(quality: ConnectionQuality = getConnectionQuality()): boolean {
  return quality.slow;
}
