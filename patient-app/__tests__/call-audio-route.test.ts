import { defaultRoute, nextRoute, routesFromOutputs } from '../src/calls/audioRoute';
import { emitCallHold, onCallHold } from '../src/calls/callHold';

describe('audio routes', () => {
  it('maps Android outputs and orders headsets first', () => {
    expect(routesFromOutputs(['speaker', 'earpiece', 'bluetooth'], 'android')).toEqual(['bluetooth', 'earpiece', 'speaker']);
    expect(routesFromOutputs(['headset', 'speaker'], 'android')).toEqual(['headset', 'speaker']);
  });

  it('iOS offers default (earpiece or the connected headset) and the speaker', () => {
    expect(routesFromOutputs(['default', 'force_speaker'], 'ios')).toEqual(['earpiece', 'speaker']);
  });

  it('falls back to a usable route when the phone lists nothing', () => {
    expect(routesFromOutputs([], 'ios')).toEqual(['earpiece']);
    expect(routesFromOutputs([], 'android')).toEqual(['speaker']);
  });

  it('video starts on the speaker, voice on the earpiece, a headset always wins', () => {
    const all = routesFromOutputs(['speaker', 'earpiece'], 'android');
    expect(defaultRoute(true, all)).toBe('speaker');
    expect(defaultRoute(false, all)).toBe('earpiece');
    expect(defaultRoute(true, routesFromOutputs(['speaker', 'earpiece', 'bluetooth'], 'android'))).toBe('bluetooth');
    expect(defaultRoute(false, routesFromOutputs(['speaker', 'headset'], 'android'))).toBe('headset');
  });

  it('one tap cycles through the available routes and wraps', () => {
    const r = routesFromOutputs(['speaker', 'earpiece', 'bluetooth'], 'android');
    expect(nextRoute('bluetooth', r)).toBe('earpiece');
    expect(nextRoute('speaker', r)).toBe('bluetooth');
    expect(nextRoute('speaker', [])).toBe('speaker');
  });
});

describe('call hold', () => {
  it('tells the screen when the line is taken and given back, and stops after unsubscribe', () => {
    const seen: boolean[] = [];
    const off = onCallHold((h) => seen.push(h));
    emitCallHold(true);
    emitCallHold(false);
    off();
    emitCallHold(true);
    expect(seen).toEqual([true, false]);
  });
});

describe('call screen wiring', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../app/consultations/video-call.tsx'), 'utf8') as string;
  it('asks microphone and camera separately so a denied camera keeps the voice', () => {
    expect(src).toContain("setMicrophoneEnabled(true)");
    expect(src).toContain("setDenied((d) => d ?? 'cam')");
    expect(src).not.toContain('enableCameraAndMicrophone');
  });
  it('a voice call has no camera or flip control and shows the other side muted', () => {
    expect(src).toContain('isVideoCall ? <CallButton');
    expect(src).toContain('RoomEvent.TrackMuted');
  });
});
