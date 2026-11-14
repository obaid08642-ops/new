const mockHandlers: Record<string, (x: unknown) => void> = {};
const mockVoip = { addEventListener: jest.fn((e: string, cb: (x: unknown) => void) => { mockHandlers[e] = cb; }), registerVoipToken: jest.fn() };
jest.mock('react-native-voip-push-notification', () => ({ __esModule: true, default: mockVoip }), { virtual: true });
const mockApi = jest.fn(async (..._a: unknown[]) => ({}));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApi(...a) }));
const mockRing = jest.fn(async (..._a: unknown[]) => 'native');
jest.mock('../src/utils/callkeep', () => ({ canRingNatively: () => true, ringNativeCall: (...a: unknown[]) => mockRing(...a), endNativeCall: jest.fn() }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-notifications', () => ({ registerTaskAsync: jest.fn() }));
jest.mock('expo-task-manager', () => ({ isTaskDefined: () => true, defineTask: jest.fn() }));

import { answerParams, endedAs, rememberRingingCall, resetCallkeepLogicForTests } from '../src/calls/callkeepLogic';
import { getActiveCall, isBusyFor, setActiveCall } from '../src/calls/activeCall';
import { emitRingingCallOver, isStillRinging, onRingingCallOver } from '../src/calls/callSignals';

describe('native call screen: voice calls and declines', () => {
  beforeEach(resetCallkeepLogicForTests);

  it('a voice call answered from the native screen opens as voice, a video call as video, unknown defaults to video', () => {
    rememberRingingCall('v1', false);
    rememberRingingCall('v2', true);
    expect(answerParams('v1')).toEqual({ sessionId: 'v1', mode: 'voice' });
    expect(answerParams('v2')).toEqual({ sessionId: 'v2', mode: 'video' });
    expect(answerParams('never-seen').mode).toBe('video');
  });

  it('ending an unanswered call is a decline; ending an answered call is a hang-up (no /reject)', () => {
    rememberRingingCall('a', true);
    expect(endedAs('a')).toBe('decline');
    rememberRingingCall('b', true);
    answerParams('b');
    expect(endedAs('b')).toBe('hangup');
    expect(endedAs('b')).toBe('decline'); // the answered flag is spent
  });
});

describe('busy and ringing-over signals', () => {
  it('a second call while one is active is busy; the same call is not; none active is never busy', () => {
    setActiveCall(null);
    expect(isBusyFor('x')).toBe(false);
    setActiveCall('x');
    expect(getActiveCall()).toBe('x');
    expect(isBusyFor('x')).toBe(false);
    expect(isBusyFor('y')).toBe(true);
    setActiveCall(null);
  });

  it('the ringing screen is told when its call is over, only for its own session', () => {
    const seen: string[] = [];
    const off = onRingingCallOver((id) => seen.push(id));
    emitRingingCallOver('s1');
    off();
    emitRingingCallOver('s2');
    expect(seen).toEqual(['s1']);
  });

  it('only INITIATED (or unknown) still rings', () => {
    expect(isStillRinging('INITIATED')).toBe(true);
    expect(isStillRinging(undefined)).toBe(true);
    for (const st of ['FAILED', 'ENDED', 'ACTIVE', 'MISSED']) expect(isStillRinging(st)).toBe(false);
  });
});

describe('VoIP push does not wait for sign-in, only the token upload does', () => {
  const handlers = mockHandlers;
  const voip = mockVoip;

  it('listeners start signed out, a ring shows the call, the token goes up once signed in (and only once)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { startVoipListeners, setVoipAuth, resetVoipPushForTests } = require('../src/calls/voipPush') as typeof import('../src/calls/voipPush');
    resetVoipPushForTests();
    expect(await startVoipListeners()).toBe(true);
    expect(voip.registerVoipToken).toHaveBeenCalled();
    handlers.notification({ data: { type: 'call', session_id: 's9', title: 'Dr A', call_type: 'voice' } });
    await new Promise((r) => setTimeout(r, 0));
    expect(mockRing).toHaveBeenCalledWith('s9', 'Dr A', false, '');
    handlers.register('tok1');
    await new Promise((r) => setTimeout(r, 0));
    expect(mockApi).not.toHaveBeenCalled(); // not signed in yet
    setVoipAuth(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(JSON.parse((mockApi.mock.calls[0][1] as { body: string }).body)).toMatchObject({ token: 'tok1', provider: 'apns_voip', call_ring: true });
    setVoipAuth(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockApi).toHaveBeenCalledTimes(1);
  });
});

describe('screens', () => {
  const read = (p: string) => (require('fs') as typeof import('fs')).readFileSync((require('path') as typeof import('path')).join(__dirname, '..', p), 'utf8');

  it('hang-up ends the session on the server and closes the native call screen; the hold state only records, one effect decides what is sent', () => {
    const src = read('app/consultations/video-call.tsx');
    expect(src).toContain('`/calls/${encodeURIComponent(sid)}/end`');
    expect(src).toContain('endNativeCall(sid)');
    expect(src).toContain('useEffect(() => onCallHold(setHeld), [])');
    expect(src).toContain('setMicrophoneEnabled(micOn && !held)');
    expect(src).toContain('setCameraEnabled(camOn && !held)');
    expect(src).not.toContain('setMicrophoneEnabled(!h && micOn)');
  });

  it('a call answered from the ring still gets its rating: the appointment comes from the join, and without one there is no rating screen', () => {
    const src = read('app/consultations/video-call.tsx');
    expect(src).toContain('resData.appointment_id');
    expect(src).toContain("router.replace('/(tabs)/consultations' as Href)");
    expect(read('app/consultations/post-call-rating.tsx')).toContain('if (!appointmentId) home();');
  });

  it('the incoming-call screen dismisses on a missed/cancelled call and never starts a second room', () => {
    const src = read('app/consultations/incoming-call.tsx');
    expect(src).toContain('onRingingCallOver');
    expect(src).toContain('/calls/sessions/');
    expect(src).toContain('isBusyFor(sessionId)');
  });

  it('the push handler tells the ringing screens when a call is over, and call ringing is not gated on sign-in', () => {
    const src = read('src/components/NotificationHandler.tsx');
    expect(src).toContain("data.type === 'call_missed'");
    expect(src).toContain('emitRingingCallOver(');
    expect(src).toMatch(/useEffect\(\(\) => \{\s*void registerCallRingTask\(\);\s*void startVoipListeners\(\);\s*\}, \[\]\);/);
  });
});
