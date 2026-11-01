import { pushSubject, resolvePushTarget } from '../pushRouting';

describe('push tap routing', () => {
  const job = { type: 'info', screen: '/provider/job/abc-123', action: '{"route":"/provider/job/abc-123"}', related_type: 'appointment' };

  it('reads the booking out of the route the backend sends', () => {
    expect(pushSubject(job)).toEqual({ kind: 'appointment', id: 'abc-123', type: 'info' });
    expect(pushSubject({ screen: '/tracking/lab/b9' })).toMatchObject({ kind: 'lab', id: 'b9' });
    expect(pushSubject({ action: '{"route":"/provider/job/z1"}' })).toMatchObject({ id: 'z1' });
  });

  it('a doctor lands on the appointment, the other types on their notifications list', () => {
    expect(resolvePushTarget(job, 'doctor')).toEqual({ screen: 'appointment_detail', params: { param: { id: 'abc-123' } } });
    expect(resolvePushTarget(job, 'pharmacy')).toEqual({ screen: 'notifications' });
    expect(resolvePushTarget(job, 'radiology')).toEqual({ screen: 'notifications' });
  });

  it('never throws on empty or broken data', () => {
    expect(resolvePushTarget(undefined, 'doctor')).toEqual({ screen: 'notifications' });
    expect(resolvePushTarget('not json', 'lab')).toEqual({ screen: 'notifications' });
    expect(resolvePushTarget({ screen: 42 }, 'doctor')).toEqual({ screen: 'notifications' });
  });

  it('a chat push opens the lab chat', () => {
    expect(resolvePushTarget({ type: 'chat', thread_id: 't1' }, 'lab')).toEqual({ screen: 'chat' });
  });

  it('a call push opens the incoming call of that session at the root', () => {
    expect(resolvePushTarget({ type: 'call', session_id: 's1', caller_name: 'Sara', call_type: 'voice' }, 'doctor')).toEqual({ screen: 'IncomingCall', root: true, params: { sessionId: 's1', callerName: 'Sara', mode: 'voice' } });
    expect(resolvePushTarget({ type: 'call' }, 'doctor')).toEqual({ screen: 'notifications' });
  });
});
