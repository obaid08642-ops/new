import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LiveKitService } from './livekit.service';

describe('LiveKit follow-up ownership fixes', () => {
  const events = { emit: jest.fn() };
  const conn = { collection: jest.fn(() => ({ findOne: jest.fn() })) } as any;

  beforeEach(() => jest.clearAllMocks());

  it('rejects pingPatient when provider and patient have no active appointment', async () => {
    const findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const appointments = { findOne } as any;
    const service = new LiveKitService(appointments, conn, events as any);

    await expect(service.pingPatient('provider-1', 'patient-1')).rejects.toThrow(ForbiddenException);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('uses the UUID business id for markNoShow', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const findOne = jest.fn().mockResolvedValue({ id: 'appt-uuid-1', status: 'CHECKED_IN', save });
    const service = new LiveKitService({ findOne } as any, conn, events as any);

    await expect(service.markNoShow('provider-1', 'appt-uuid-1')).resolves.toEqual({ success: true, message: 'Marked as no-show' });
    expect(findOne).toHaveBeenCalledWith({ id: 'appt-uuid-1', provider_id: 'provider-1' });
    expect(save).toHaveBeenCalled();
  });

  it('rejects markNoShow when the UUID is not owned by the provider', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const service = new LiveKitService({ findOne } as any, conn, events as any);

    await expect(service.markNoShow('provider-1', 'unknown-appointment')).rejects.toThrow(NotFoundException);
  });
});
