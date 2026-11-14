import { ringAction, payloadData } from '../ringTask';
import { answerParams, endedAs, rememberRingingCall, resetCallkeepLogicForTests } from '../callkeepLogic';
import { setActiveCall, isBusyFor } from '../activeCall';
import { isStillRinging } from '../callSignals';

describe('what a call push does', () => {
  it('a call push rings with the caller and the call type', () => {
    expect(ringAction({ type: 'call', session_id: 's1', caller_name: 'Sara', call_type: 'voice', body: 'calling' })).toEqual({ kind: 'ring', sessionId: 's1', caller: 'Sara', video: false, body: 'calling' });
    expect(ringAction({ type: 'call', sessionId: 's2' })).toMatchObject({ kind: 'ring', sessionId: 's2', video: true });
  });
  it('a cancelled or missed call ends the ringing; anything else, or no session, is ignored', () => {
    expect(ringAction({ type: 'call_cancelled', session_id: 's1' })).toEqual({ kind: 'end', sessionId: 's1' });
    expect(ringAction({ type: 'call_missed', session_id: 's1' })).toEqual({ kind: 'end', sessionId: 's1' });
    expect(ringAction({ type: 'chat', session_id: 's1' })).toEqual({ kind: 'ignore' });
    expect(ringAction({ type: 'call' })).toEqual({ kind: 'ignore' });
    expect(ringAction(null)).toEqual({ kind: 'ignore' });
  });
  it('reads the Android task payload in both shapes', () => {
    expect(payloadData({ data: { dataString: '{"type":"call","session_id":"s1"}' } })).toEqual({ type: 'call', session_id: 's1' });
    expect(payloadData({ data: { data: { type: 'call', session_id: 's2' } } })).toEqual({ type: 'call', session_id: 's2' });
    expect(payloadData({ data: { dataString: '{broken' } })).toBeNull();
    expect(payloadData(undefined)).toBeNull();
  });
});

describe('answering and declining on the system call screen', () => {
  beforeEach(resetCallkeepLogicForTests);
  it('an answered voice call opens as voice, and ending it is a hang-up, not a decline', () => {
    rememberRingingCall('s1', false);
    expect(answerParams('s1')).toEqual({ sessionId: 's1', mode: 'voice' });
    expect(endedAs('s1')).toBe('hangup');
  });
  it('a call never answered ends as a decline', () => {
    rememberRingingCall('s2', true);
    expect(endedAs('s2')).toBe('decline');
  });
  it('a second call while one runs is busy; the same session is not', () => {
    setActiveCall('s1');
    expect(isBusyFor('s2')).toBe(true);
    expect(isBusyFor('s1')).toBe(false);
    setActiveCall(null);
    expect(isBusyFor('s2')).toBe(false);
  });
  it('a session rings only while INITIATED', () => {
    expect(isStillRinging('INITIATED')).toBe(true);
    expect(isStillRinging('ACTIVE')).toBe(false);
  });
});
