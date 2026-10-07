/**
 * 15.4 — degrade gracefully on a weak link.
 *
 * Two policies, both pure so they can be unit-tested without a network:
 *
 *  • IMAGE QUALITY. On a slow or metered connection the app asks the CDN for a
 *    smaller variant instead of downloading a 2 MB photo that will take a minute
 *    on 3G. The tier is derived from the connectivity snapshot the single client
 *    already maintains.
 *
 *  • CALL FALLBACK. A video consultation that cannot hold a connection falls back
 *    to audio, and a call that cannot hold audio falls back to chat. The order is
 *    fixed by the task: video → audio → chat.
 */
import { getConnectivity, isPoorlyConnected, type ConnectionQuality } from '../http/connectivity';

export type ImageQualityTier = 'low' | 'medium' | 'high';

export interface ImageRequest {
  url: string;
  width?: number;
  height?: number;
}

/**
 * Per-tier rendition. The CDN is expected to expose these widths; a URL that
 * already carries a width parameter is rewritten rather than duplicated.
 */
export const IMAGE_TIER_WIDTH: Record<ImageQualityTier, number> = {
  low: 320,
  medium: 640,
  high: 1280,
};

/** File-size budget per tier, used to explain the choice in the UI copy. */
export const IMAGE_TIER_BUDGET_KB: Record<ImageQualityTier, number> = {
  low: 40,
  medium: 120,
  high: 400,
};

export function qualityTierFor(connection: ConnectionQuality): ImageQualityTier {
  if (connection === 'offline') return 'low';
  if (connection === 'poor') return 'low';
  if (connection === 'good') return 'high';
  // Unknown: assume a mid rendition rather than the largest.
  return 'medium';
}

export function currentImageQualityTier(): ImageQualityTier {
  return qualityTierFor(getConnectivity().quality);
}

/**
 * Request a rendition at the given tier. No network call, no upload: the point is
 * to spend fewer bytes on a link that cannot afford them.
 */
export function imageUrlForTier(request: ImageRequest, tier: ImageQualityTier): string {
  const targetWidth = Math.min(request.width ?? IMAGE_TIER_WIDTH[tier], IMAGE_TIER_WIDTH[tier]);
  const [base, query = ''] = request.url.split('?');
  const params = new URLSearchParams(query);
  params.set('w', String(targetWidth));
  if (request.height) {
    // Keep the aspect ratio the caller asked for.
    const ratio = request.height / (request.width || targetWidth);
    params.set('h', String(Math.round(targetWidth * ratio)));
  }
  params.set('q', tier === 'low' ? '45' : tier === 'medium' ? '70' : '85');
  return `${base}?${params.toString()}`;
}

/** Pick the best rendition this connection can afford right now. */
export function adaptiveImageUrl(request: ImageRequest, connection?: ConnectionQuality): string {
  const tier = qualityTierFor(connection ?? getConnectivity().quality);
  return imageUrlForTier(request, tier);
}

/**
 * True when the link cannot afford a full-size image.
 *
 * `unknown` is deliberately NOT a downgrade: it is the state before NetInfo has
 * reported anything, and treating it as poor would blank every product photo on
 * first paint. An unknown link gets the mid tier.
 */
export function shouldDowngradeImages(connection?: ConnectionQuality): boolean {
  const quality = connection ?? getConnectivity().quality;
  return quality === 'poor' || quality === 'offline';
}

/**
 * True when the image should not be fetched at all.
 *
 * `imageUrlForTier` is the right answer when the CDN runs an image transformer,
 * but nothing in this repo configures one, so appending `?w=&q=` to a CDN that
 * ignores them would download the original anyway and claim a saving that never
 * happened. The honest degradation on a link that cannot afford the bytes is to
 * spend none: show the local placeholder until the link recovers.
 */
export function shouldSkipRemoteImage(connection?: ConnectionQuality): boolean {
  const quality = connection ?? getConnectivity().quality;
  return quality === 'poor' || quality === 'offline';
}

// ─────────────────────────────────────────────────────────────────────────────
// Call fallback: video → audio → chat
// ─────────────────────────────────────────────────────────────────────────────

export type CallModality = 'video' | 'audio' | 'chat';

export interface CallFallbackPlan {
  /** The modality the user should be on now. */
  modality: CallModality;
  /** Whether the change is a downgrade the user must be told about. */
  degraded: boolean;
  reason?: 'network_lost' | 'poor_network' | 'media_failed';
  /** Copy for the banner, in both shipped locales. */
  message: { ar: string; en: string };
}

const MESSAGES: Record<CallModality, { ar: string; en: string }> = {
  video: { ar: 'مكالمة فيديو', en: 'Video call' },
  audio: { ar: 'انخفضت جودة الشبكة — تم تحويل المكالمة إلى صوت', en: 'Poor network — the call switched to audio' },
  chat: { ar: 'تعذّر بث الصوت — تم تحويل المحادثة إلى رسائل', en: 'Audio failed — the consultation moved to chat' },
};

export function planCallFallback(
  current: CallModality,
  signal: { online: boolean; quality?: ConnectionQuality } = { online: true },
): CallFallbackPlan {
  const online = signal.online;
  const poor = signal.quality ? isPoorlyConnectedValue(signal.quality) : false;

  if (current === 'video' && (!online || poor)) {
    // 15.4: video falls back to AUDIO first, not straight to chat.
    return { modality: 'audio', degraded: true, reason: online ? 'poor_network' : 'network_lost', message: MESSAGES.audio };
  }
  if (current === 'audio' && !online) {
    // No link at all: chat is the only thing left that can work.
    return { modality: 'chat', degraded: true, reason: 'network_lost', message: MESSAGES.chat };
  }
  if (current === 'audio' && poor) {
    return { modality: current, degraded: false, message: MESSAGES.audio };
  }
  return { modality: current, degraded: false, message: MESSAGES[current] };
}

function isPoorlyConnectedValue(quality: ConnectionQuality): boolean {
  return quality === 'poor' || quality === 'offline';
}

/** The full ladder, for a UI that wants to show what would happen next. */
export const CALL_FALLBACK_LADDER: readonly CallModality[] = ['video', 'audio', 'chat'];

export function nextModality(current: CallModality): CallModality | null {
  const index = CALL_FALLBACK_LADDER.indexOf(current);
  if (index < 0 || index === CALL_FALLBACK_LADDER.length - 1) return null;
  return CALL_FALLBACK_LADDER[index + 1];
}
