import { ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';

// Live chat journey finding: any caller who knew a booking id was added to its conversation,
// and a client-supplied provider_id was added too.
describe('ChatService booking thread membership', () => {
  const make = (existing: any = null) => {
    const threads: any = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn(async (d: any) => ({ ...d, id: 't1', toObject: () => ({ ...d, id: 't1' }) })),
      updateOne: jest.fn(),
    };
    const svc = new ChatService(threads, {} as any, {} as any, {} as any);
    jest.spyOn(svc as any, 'resolveBookingParties').mockResolvedValue({ patientId: 'patient-1', providerId: 'doctor-1' });
    return { svc, threads };
  };

  it('an outsider cannot open or join the booking conversation', async () => {
    const { svc, threads } = make();
    await expect(svc.getOrCreateBookingThread('consultation', 'appt-1', 'stranger', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
    expect(threads.create).not.toHaveBeenCalled();
  });

  it('the thread holds exactly the booking parties, never a client provider id', async () => {
    const { svc, threads } = make();
    await svc.getOrCreateBookingThread('consultation', 'appt-1', 'patient-1', 'someone-else');
    expect(threads.create).toHaveBeenCalledWith(expect.objectContaining({ participant_ids: ['patient-1', 'doctor-1'] }));
  });
});
