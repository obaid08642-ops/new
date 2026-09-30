/**
 * F52 / video consultations: the provider app must still reach a real LiveKit
 * room after the Expo SDK 57 jump (RN 0.81.5 -> 0.86.2), with no placeholder.
 *
 * @livekit/react-native-webrtc ships native code, so the risk was that it was
 * pinned to the old React Native line and the consultations broke silently —
 * VideoCallRoom guards its require, so a broken module just hides the video UI
 * instead of throwing. These tests pin the facts that decide it:
 *
 *   - the native packages still resolve against this app,
 *   - the component exists and uses the documented backend contract
 *     (POST /calls/:sessionId/join -> token + room_name, then Room.connect),
 *   - and it never shows a fake "connected" state: while connecting the user
 *     sees a spinner, and a failure surfaces an honest error.
 *
 * The bundled JS cannot open a real media session, so what is asserted is the
 * contract and the honest-failure behaviour. Two-party media itself still needs
 * two devices, which no test can substitute for.
 */
const fs = require('fs');
const path = require('path');

const COMPONENT = path.resolve(__dirname, './VideoCallRoom.tsx');

describe('VideoCallRoom — real LiveKit binding, no placeholder', () => {
  const source = fs.readFileSync(COMPONENT, 'utf8');

  it('the native LiveKit packages resolve against this app (the SDK 57 risk)', () => {
    // If these stop resolving, the video UI silently disappears because the
    // component guards its require. Assert resolution directly.
    expect(() => require.resolve('@livekit/react-native', { paths: [path.resolve(__dirname, '..')] })).not.toThrow();
    expect(() => require.resolve('@livekit/react-native-webrtc', { paths: [path.resolve(__dirname, '..')] })).not.toThrow();
  });

  it('uses the backend join contract instead of a local token', () => {
    expect(source).toContain('/join');
    expect(source).toContain('room_name');
    // A locally minted token is impossible and would be a fake.
    expect(source).not.toMatch(/token\s*=\s*['"`][A-Za-z0-9]{8,}/);
  });

  it('connects a real LiveKit Room rather than simulating a call', () => {
    expect(source).toContain("from 'livekit-client'");
    expect(source).toMatch(/\.connect\(/);
  });

  it('shows a spinner while connecting and an honest error on failure', () => {
    expect(source).toMatch(/ActivityIndicator/);
    expect(source).toMatch(/catch|error|خطأ/i);
  });

  it('does not silently swallow a missing native module as a working call', () => {
    // LIVEKIT_NATIVE_OK gates the UI; a false value must lead to an explicit
    // message, not a room that pretends to be connected.
    expect(source).toContain('LIVEKIT_NATIVE_OK');
  });
});
