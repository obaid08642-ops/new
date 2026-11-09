import { LiveKitService } from './livekit.service';

/** Ending a call while it still rings tells the other side's devices to stop ringing. */
function serviceWith(session: any) {
  const service: any = Object.create(LiveKitService.prototype);
  service.logger = { log: jest.fn() };
  service.events = { emit: jest.fn() };
  const col = {
    findOne: jest.fn().mockResolvedValue(session),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };
  service.conn = { collection: () => col };
  return service;
}

describe('LiveKitService.endCall', () => {
  it('emits call.cancelled to the other party when the call was still INITIATED', async () => {
    const service = serviceWith({ id: 's1', status: 'INITIATED', patient_id: 'p1', provider_id: 'd1' });
    await service.endCall('s1', 'd1');
    expect(service.events.emit).toHaveBeenCalledWith('call.cancelled', { callee_id: 'p1', caller_id: 'd1', session_id: 's1' });
  });
  it('emits nothing when the call was already answered', async () => {
    const service = serviceWith({ id: 's1', status: 'ACTIVE', patient_id: 'p1', provider_id: 'd1', started_at: new Date() });
    await service.endCall('s1', 'p1');
    expect(service.events.emit).not.toHaveBeenCalled();
  });
});

describe('LiveKitService.sweepUnanswered', () => {
  const sweepService = (rows: any[], modified = 1) => {
    const service: any = Object.create(LiveKitService.prototype);
    service.events = { emit: jest.fn() };
    const col = {
      find: jest.fn().mockReturnValue({ limit: () => ({ toArray: async () => rows }) }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: modified }),
    };
    service.conn = { collection: () => col };
    return { service, col };
  };

  it('marks an unanswered call MISSED and tells the callee', async () => {
    const { service, col } = sweepService([{ id: 's1', patient_id: 'p1', provider_id: 'd1', caller_id: 'd1', callee_id: 'p1' }]);
    expect(await service.sweepUnanswered(new Date('2026-11-01T10:00:00Z'))).toBe(1);
    expect(col.updateOne).toHaveBeenCalledWith({ id: 's1', status: 'INITIATED' }, expect.objectContaining({ $set: expect.objectContaining({ status: 'MISSED', end_reason: 'unanswered' }) }));
    expect(service.events.emit).toHaveBeenCalledWith('call.missed', { callee_id: 'p1', caller_id: 'd1', session_id: 's1', patient_id: 'p1' });
  });
  it('says nothing when the call was answered meanwhile', async () => {
    const { service } = sweepService([{ id: 's2', patient_id: 'p1', provider_id: 'd1', caller_id: 'd1', callee_id: 'p1' }], 0);
    expect(await service.sweepUnanswered()).toBe(0);
    expect(service.events.emit).not.toHaveBeenCalled();
  });
  it('a doctor as the callee gets the push but no patient notice', async () => {
    const { service } = sweepService([{ id: 's3', patient_id: 'p1', provider_id: 'd1', caller_id: 'p1', callee_id: 'd1' }]);
    await service.sweepUnanswered();
    expect(service.events.emit).toHaveBeenCalledWith('call.missed', expect.objectContaining({ callee_id: 'd1', patient_id: undefined }));
  });
});
