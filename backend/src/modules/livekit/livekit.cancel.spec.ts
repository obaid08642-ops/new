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
