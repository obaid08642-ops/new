/**
 * Calls must have the WebRTC globals before the first Room: livekit-client does not run on a native build without
 * @livekit/react-native's registerGlobals(). patient-app used to never call it (provider-app does).
 */
const order: string[] = [];
const mockRegisterGlobals = jest.fn(() => { order.push('registerGlobals'); });
const mockStartAudio = jest.fn(async () => { order.push('startAudio'); });
const mockStopAudio = jest.fn(async () => { order.push('stopAudio'); });

jest.mock('@livekit/react-native', () => ({
  registerGlobals: () => mockRegisterGlobals(),
  AudioSession: { startAudioSession: () => mockStartAudio(), stopAudioSession: () => mockStopAudio() },
  VideoView: () => null,
  LiveKitRoom: () => null,
}));

import fs from 'node:fs';
import path from 'node:path';
import { ensureLiveKitGlobals, resetLiveKitNativeForTests, startCallAudio, stopCallAudio } from '../src/calls/livekitNative';

beforeEach(() => { order.length = 0; jest.clearAllMocks(); resetLiveKitNativeForTests(); });

describe('LiveKit native globals', () => {
  it('registers the globals once, however many calls and screens ask', () => {
    expect(ensureLiveKitGlobals()).toBe(true);
    expect(ensureLiveKitGlobals()).toBe(true);
    expect(mockRegisterGlobals).toHaveBeenCalledTimes(1);
  });

  it('starts and stops the audio session around a call', async () => {
    await startCallAudio();
    await stopCallAudio();
    expect(order).toEqual(['startAudio', 'stopAudio']);
  });

  it('a failing audio session never ends the call', async () => {
    mockStartAudio.mockRejectedValueOnce(new Error('route busy'));
    await expect(startCallAudio()).resolves.toBeUndefined();
  });

  it('answers false (no crash) when the native module is absent, as in Expo Go', () => {
    jest.resetModules();
    jest.doMock('@livekit/react-native', () => { throw new Error('Cannot find native module'); });
    const fresh = require('../src/calls/livekitNative');
    expect(fresh.ensureLiveKitGlobals()).toBe(false);
    jest.dontMock('@livekit/react-native');
  });
});

describe('both call screens install the globals before they create a room', () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

  it('video-call.tsx calls ensureLiveKitGlobals() at load and again before new Room()', () => {
    const src = read('app/consultations/video-call.tsx');
    expect(src).toMatch(/^ensureLiveKitGlobals\(\);$/m);
    expect(src.indexOf('ensureLiveKitGlobals();\n        await startCallAudio();')).toBeGreaterThan(-1);
    expect(src.indexOf('await startCallAudio();')).toBeLessThan(src.indexOf('new Room('));
    expect(src).toContain('stopCallAudio()');
  });

  it('room/[id].tsx installs them at load and runs the audio session with the screen', () => {
    const src = read('app/room/[id].tsx');
    expect(src).toMatch(/^ensureLiveKitGlobals\(\);$/m);
    expect(src).toContain('startCallAudio()');
    expect(src).toContain('stopCallAudio()');
  });

  it('only @livekit/react-native-webrtc is installed: the second native WebRTC library is gone', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['@livekit/react-native-webrtc']).toBeTruthy();
    expect(pkg.dependencies['react-native-webrtc']).toBeUndefined();
    const lock = read('package-lock.json');
    expect(lock).not.toMatch(/"node_modules\/react-native-webrtc"/);
  });
});
