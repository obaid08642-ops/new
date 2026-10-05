/**
 * 15.1 — offline detection, and the single source of truth for "is the device
 * online right now".
 *
 * Two inputs:
 *   1. `@react-native-community/netinfo` push events, when the native module is
 *      available (it is not under Jest, and not on every web runtime).
 *   2. The request layer itself: a transport failure is proof of no connectivity,
 *      a successful response is proof there is. This is what makes detection work
 *      in tests and on runtimes without NetInfo.
 *
 * Consumers (offline banner, the 15.4 outbox) subscribe here rather than opening
 * their own NetInfo listener, so there is one connectivity signal in the app.
 */

export type ConnectionQuality = 'unknown' | 'offline' | 'poor' | 'good';

export interface ConnectivitySnapshot {
  online: boolean;
  /** NetInfo's `isInternetReachable`, or null when unknown. */
  internetReachable: boolean | null;
  /** NetInfo's connection type: wifi / cellular / none / … */
  connectionType: string;
  quality: ConnectionQuality;
  /** When this snapshot was last updated (epoch ms). */
  changedAt: number;
}

type Listener = (snapshot: ConnectivitySnapshot) => void;

const listeners = new Set<Listener>();

let snapshot: ConnectivitySnapshot = {
  online: true,
  internetReachable: null,
  connectionType: 'unknown',
  quality: 'unknown',
  changedAt: 0,
};

let unwatchNetInfo: (() => void) | null = null;

function emit(next: Partial<ConnectivitySnapshot>): void {
  const merged: ConnectivitySnapshot = { ...snapshot, ...next };
  const changed =
    merged.online !== snapshot.online ||
    merged.internetReachable !== snapshot.internetReachable ||
    merged.connectionType !== snapshot.connectionType ||
    merged.quality !== snapshot.quality;
  snapshot = { ...merged, changedAt: changed ? Date.now() : snapshot.changedAt };
  if (!changed) return;
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // A misbehaving subscriber must not break connectivity bookkeeping.
    }
  });
}

export function getConnectivity(): ConnectivitySnapshot {
  return snapshot;
}

export function isOffline(): boolean {
  return !snapshot.online;
}

/** `true` only when NetInfo positively reported a usable link. */
export function isPoorlyConnected(): boolean {
  return snapshot.quality === 'poor' || snapshot.quality === 'offline';
}

export function subscribeConnectivity(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

export function setConnectivity(next: Partial<ConnectivitySnapshot>): void {
  emit(next);
}

export function markOnline(): void {
  emit({ online: true });
}

export function markOffline(): void {
  emit({ online: false, quality: 'offline' });
}

export function markTransportFailure(): void {
  emit({ online: false });
}

export function markTransportSuccess(): void {
  if (snapshot.online && snapshot.internetReachable !== false) return;
  emit({ online: true });
}

/** Reset for tests. */
export function resetConnectivity(): void {
  listeners.clear();
  stopConnectivityWatch();
  snapshot = { online: true, internetReachable: null, connectionType: 'unknown', quality: 'unknown', changedAt: 0 };
}

function qualityFor(type: string, reachable: boolean | null): ConnectionQuality {
  if (reachable === false) return 'offline';
  if (type === 'wifi' || type === 'ethernet') return 'good';
  if (type === 'cellular') return 'poor';
  return reachable === true ? 'good' : 'unknown';
}

/**
 * Attach the NetInfo push listener. Idempotent, and a no-op (returning false) when
 * the native module is absent so a test or a web runtime degrades to
 * transport-derived detection instead of crashing.
 */
export function startConnectivityWatch(): boolean {
  if (unwatchNetInfo) return true;
  try {
    // Required lazily: this module is imported by plain unit tests where the
    // native module is absent.
    const netinfo = require('@react-native-community/netinfo');
    const NetInfo = netinfo?.default ?? netinfo;
    if (!NetInfo?.addEventListener) return false;
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      const reachable = typeof state?.isInternetReachable === 'boolean' ? state.isInternetReachable : null;
      const online = state?.isConnected !== false && reachable !== false;
      emit({
        online,
        internetReachable: reachable,
        connectionType: String(state?.type ?? 'unknown'),
        quality: qualityFor(String(state?.type ?? 'unknown'), reachable),
      });
    });
    unwatchNetInfo = typeof unsubscribe === 'function' ? unsubscribe : () => {};
    return true;
  } catch {
    return false;
  }
}

export function stopConnectivityWatch(): void {
  if (!unwatchNetInfo) return;
  try {
    unwatchNetInfo();
  } catch {
    // Unsubscribing a dead native listener is not an error worth surfacing.
  }
  unwatchNetInfo = null;
}
