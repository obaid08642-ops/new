/**
 * The native side of a LiveKit call. `livekit-client` runs on top of WebRTC globals (RTCPeerConnection, mediaDevices, ...) that exist in a
 * browser but not in React Native: `@livekit/react-native`'s registerGlobals() installs them from @livekit/react-native-webrtc and must run once
 * before the first Room is created, otherwise the call cannot connect on a native build. The audio session (iOS AVAudioSession / Android
 * AudioManager) is started for the length of a call so the voice is routed and the call does not fall silent in the background.
 *
 * The module is a NATIVE one and absent in Expo Go, so it is loaded defensively (a static import crashes the whole screen there).
 */
type LiveKitNative = {
  registerGlobals?: () => void;
  AudioSession?: { startAudioSession: () => Promise<void> | void; stopAudioSession: () => Promise<void> | void };
};

let native: LiveKitNative | null | undefined;
let registered = false;

function load(): LiveKitNative | null {
  if (native === undefined) {
    try {
      native = require('@livekit/react-native') as LiveKitNative; // eslint-disable-line @typescript-eslint/no-require-imports
    } catch {
      native = null;
    }
  }
  return native;
}

/** Installs the WebRTC globals once. Returns false when the native module is missing (Expo Go, web): the caller shows its no-video state. */
export function ensureLiveKitGlobals(): boolean {
  const lk = load();
  if (!lk?.registerGlobals) return false;
  if (!registered) {
    lk.registerGlobals();
    registered = true;
  }
  return true;
}

export async function startCallAudio(): Promise<void> {
  try {
    await load()?.AudioSession?.startAudioSession();
  } catch {
    /* a failed audio session must not end the call; the OS default route stays */
  }
}

export async function stopCallAudio(): Promise<void> {
  try {
    await load()?.AudioSession?.stopAudioSession();
  } catch {
    /* already stopped */
  }
}

/** Test hook: forget what was registered. */
export function resetLiveKitNativeForTests(): void {
  native = undefined;
  registered = false;
}
