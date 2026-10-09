import { ChatService } from './chat.service';

// Needs-review #1158: the follow-up window after a consultation is 72 hours (decision 24), not 24.
describe('ChatService consultation follow-up window', () => {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
  const service = (completedAt: Date, configured?: number) => {
    const threads = { findOne: jest.fn().mockResolvedValue({ id: 't1', type: 'booking', booking_kind: 'consultation', booking_id: 'ap1', participant_ids: ['p1', 'd1'] }) };
    const svc = new ChatService(threads as any, {} as any, {} as any, {} as any);
    const models: Record<string, unknown> = {
      FamilyGroup: { countDocuments: jest.fn().mockResolvedValue(0) },
      Appointment: { findOne: jest.fn().mockResolvedValue({ id: 'ap1', status: 'COMPLETED', completed_at: completedAt }) },
      SystemConfig: { findOne: jest.fn().mockResolvedValue(configured === undefined ? null : { value: { consultation_followup_hours: configured } }) },
    };
    jest.spyOn(svc, 'getModel').mockImplementation((name: string) => models[name] as any);
    return svc;
  };

  it('allows a message 48 hours after the consultation when no window is configured', async () => {
    await expect(service(hoursAgo(48)).verifyCommunicationAllowed('t1', 'p1')).resolves.toEqual({ allowed: true });
  });

  it('closes the window after 72 hours', async () => {
    await expect(service(hoursAgo(73)).verifyCommunicationAllowed('t1', 'p1')).resolves.toMatchObject({ allowed: false });
  });

  it('still honours a configured window', async () => {
    await expect(service(hoursAgo(10), 6).verifyCommunicationAllowed('t1', 'p1')).resolves.toMatchObject({ allowed: false });
  });
});
