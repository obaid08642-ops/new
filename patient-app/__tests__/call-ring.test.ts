const mockRing = jest.fn();
const mockEnd = jest.fn();
jest.mock('../src/utils/callkeep', () => ({ ringNativeCall: (...a: unknown[]) => mockRing(...a), endNativeCall: (...a: unknown[]) => mockEnd(...a), canRingNatively: () => true }));
jest.mock('expo-notifications', () => ({ registerTaskAsync: jest.fn() }));
jest.mock('expo-task-manager', () => ({ isTaskDefined: () => true, defineTask: jest.fn() }));

import { ringAction, handleRingPayload, payloadData } from '../src/calls/ringTask';

describe('call ring task', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rings for a call push with the caller name and call type', async () => {
    await handleRingPayload({ type: 'call', session_id: 's1', title: 'Dr Amal', call_type: 'voice' });
    expect(mockRing).toHaveBeenCalledWith('s1', 'Dr Amal', false, '');
  });

  it('video is the default call type', () => {
    expect(ringAction({ type: 'incoming_call', sessionId: 's2', caller_name: 'Dr X' })).toEqual({ kind: 'ring', sessionId: 's2', caller: 'Dr X', video: true, body: '' });
  });

  it('a cancelled or missed call ends the ringing screen', async () => {
    await handleRingPayload({ type: 'call_cancelled', session_id: 's1' });
    expect(mockEnd).toHaveBeenCalledWith('s1');
    expect(mockRing).not.toHaveBeenCalled();
  });

  it('ignores other pushes and pushes without a session', async () => {
    await handleRingPayload({ type: 'chat', session_id: 's1' });
    await handleRingPayload({ type: 'call' });
    await handleRingPayload(null);
    expect(mockRing).not.toHaveBeenCalled();
    expect(mockEnd).not.toHaveBeenCalled();
  });

  it('reads the Android payload from dataString and from plain data', () => {
    expect(payloadData({ data: { dataString: JSON.stringify({ type: 'call', session_id: 's9' }) } })).toEqual({ type: 'call', session_id: 's9' });
    expect(payloadData({ data: { dataString: '{bad' } })).toBeNull();
    expect(payloadData({ data: { type: 'call', session_id: 's3' } })).toMatchObject({ session_id: 's3' });
  });
});

describe('answering a ringing call', () => {
  const fs = require('fs') as typeof import('fs');
  const read = (p: string) => fs.readFileSync(require('path').join(__dirname, '..', p), 'utf8');

  it('the call screen joins the ringing session and only the caller initiates', () => {
    const src = read('app/consultations/video-call.tsx');
    expect(src).toContain('sessionId: ringingSessionId');
    expect(src).toMatch(/ringingSessionId\s*\n?\s*\? \{ session_id: String\(ringingSessionId\) \}/);
  });

  it('this device registers as call_ring only when it can ring natively', () => {
    expect(read('src/utils/notifications.ts')).toContain('call_ring: canRingNatively()');
  });
});
