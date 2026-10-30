/**
 * Where the call audio comes out: earpiece, speaker, a Bluetooth headset or a wired headset. LiveKit's AudioSession lists the outputs
 * the phone offers (Android: speaker / earpiece / headset / bluetooth; iOS: default / force_speaker, the OS picks Bluetooth and wired
 * itself and `default` follows them). A video call starts on the speaker, a voice call on the earpiece, and a connected headset always wins.
 */
export type AudioRoute = 'earpiece' | 'speaker' | 'bluetooth' | 'headset';

type AudioSessionApi = {
  getAudioOutputs?: () => Promise<string[]>;
  selectAudioOutput?: (id: string) => Promise<void>;
};

let api: AudioSessionApi | null | undefined;
function session(): AudioSessionApi | null {
  if (api === undefined) {
    try {
      api = (require('@livekit/react-native') as { AudioSession?: AudioSessionApi }).AudioSession ?? null; // eslint-disable-line @typescript-eslint/no-require-imports
    } catch {
      api = null;
    }
  }
  return api;
}

/** Maps the platform output ids to routes. iOS `default` is the earpiece (or the headset the OS has connected). */
export function routesFromOutputs(outputs: string[], os: 'ios' | 'android'): AudioRoute[] {
  const found = new Set<AudioRoute>();
  for (const o of outputs) {
    const id = o.toLowerCase();
    if (id === 'speaker' || id === 'force_speaker') found.add('speaker');
    else if (id === 'earpiece' || id === 'default') found.add('earpiece');
    else if (id.includes('bluetooth')) found.add('bluetooth');
    else if (id === 'headset' || id.includes('wired')) found.add('headset');
  }
  if (found.size === 0) found.add(os === 'ios' ? 'earpiece' : 'speaker');
  return (['bluetooth', 'headset', 'earpiece', 'speaker'] as AudioRoute[]).filter((r) => found.has(r));
}

export function defaultRoute(video: boolean, available: AudioRoute[]): AudioRoute {
  if (available.includes('bluetooth')) return 'bluetooth';
  if (available.includes('headset')) return 'headset';
  if (video && available.includes('speaker')) return 'speaker';
  return available.includes('earpiece') ? 'earpiece' : available[0] ?? 'speaker';
}

/** One tap moves to the next available route (headsets first, then earpiece, then speaker). */
export function nextRoute(current: AudioRoute, available: AudioRoute[]): AudioRoute {
  if (available.length === 0) return current;
  const i = available.indexOf(current);
  return available[(i + 1) % available.length];
}

function outputId(route: AudioRoute, os: 'ios' | 'android'): string {
  if (os === 'ios') return route === 'speaker' ? 'force_speaker' : 'default';
  return route;
}

export async function availableRoutes(os: 'ios' | 'android'): Promise<AudioRoute[]> {
  try {
    const outputs = (await session()?.getAudioOutputs?.()) ?? [];
    return routesFromOutputs(outputs, os);
  } catch {
    return routesFromOutputs([], os);
  }
}

/** Returns false when the OS refused (the previous route stays; the caller keeps its state). */
export async function selectRoute(route: AudioRoute, os: 'ios' | 'android'): Promise<boolean> {
  try {
    const s = session();
    if (!s?.selectAudioOutput) return false;
    await s.selectAudioOutput(outputId(route, os));
    return true;
  } catch {
    return false;
  }
}

export function resetAudioRouteForTests(): void {
  api = undefined;
}
