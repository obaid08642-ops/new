import { BadRequestException } from '@nestjs/common';
import { LiveKitService } from './livekit.service';

/** Gap 8: the virtual waiting room is for video consultations; every row says its kind and the list can be cut to one kind. */
describe('LiveKitService.getProviderWaitingRoom', () => {
  const rows = [
    { id: 'a-video', service_type: 'video', status: 'CONFIRMED', patient_name: 'Huda', slot_start: new Date() },
    { id: 'a-clinic', service_type: 'clinic', status: 'CHECKED_IN', patient_name: 'Omar', slot_start: new Date() },
    { id: 'a-home', service_type: 'home', status: 'PENDING', patient_name: 'Sara', slot_start: new Date() },
  ];
  const make = () => {
    const find = jest.fn((q: any) => ({ lean: async () => rows.filter((r) => !q.service_type || r.service_type === q.service_type) }));
    const svc: any = Object.create(LiveKitService.prototype);
    svc.appointments = { find };
    return { svc: svc as LiveKitService, find };
  };

  it('every row carries its service type', async () => {
    const { svc } = make();
    const out = await svc.getProviderWaitingRoom('doc-1');
    expect(out.map((r: any) => [r.id, r.service_type])).toEqual([['a-video', 'video'], ['a-clinic', 'clinic'], ['a-home', 'home']]);
  });

  it('asking for video keeps only video appointments, and the filter is part of the query', async () => {
    const { svc, find } = make();
    const out = await svc.getProviderWaitingRoom('doc-1', 'video');
    expect(out.map((r: any) => r.id)).toEqual(['a-video']);
    expect(find.mock.calls[0][0]).toMatchObject({ doctor_user_id: 'doc-1', service_type: 'video' });
  });

  it('an unknown kind is a 400, never passed on to the query (no operator can get in)', async () => {
    const { svc, find } = make();
    await expect(svc.getProviderWaitingRoom('doc-1', 'spaceship')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.getProviderWaitingRoom('doc-1', { $ne: 'x' } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(find).not.toHaveBeenCalled();
  });
});
