import { EmergencyService } from './emergency.service';

/** P6.x-5: 997 escalation rules. */
describe('EmergencyService.escalate997', () => {
  const make = (doc: any) => {
    const model: any = {
      findOne: jest.fn().mockResolvedValue(doc),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const events: any = { emit: jest.fn() };
    const svc = new EmergencyService(model, {} as any, {} as any, events);
    return { svc, model };
  };

  it('escalates an open SOS and marks audit fields', async () => {
    const { svc, model } = make({ id: 'e1', state: 'TRIGGERED', escalated_997: false });
    const out: any = await svc.escalate997('e1', { id: 'a1' }, 'critical');
    expect(out.escalated_997).toBe(true);
    expect(model.updateOne).toHaveBeenCalledWith(
      { id: { $eq: 'e1' } },
      expect.objectContaining({ $set: expect.objectContaining({ escalated_997: true }) }),
    );
  });

  it('is idempotent and refuses closed cases', async () => {
    const { svc, model } = make({ id: 'e1', state: 'TRIGGERED', escalated_997: true, escalated_997_at: 't' });
    const out: any = await svc.escalate997('e1', { id: 'a1' });
    expect(out.escalated_997).toBe(true);
    expect(model.updateOne).not.toHaveBeenCalled();
    const closed = make({ id: 'e2', state: 'RESOLVED' });
    await expect(closed.svc.escalate997('e2', { id: 'a1' })).rejects.toThrow();
  });
});
