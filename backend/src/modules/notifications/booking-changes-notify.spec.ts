import { NotificationsService } from './notifications.service';

/** The other side hears about a patient cancel and about a new time. */
function setup(booking: any, account: any = { id: 'prov-acct' }) {
  const bell = { findOne: jest.fn().mockResolvedValue(null), insertOne: jest.fn().mockResolvedValue({}) };
  const collections: Record<string, any> = {
    provider_notifications: bell,
    labbookings: { findOne: jest.fn().mockResolvedValue(booking) },
    provider_accounts: { findOne: jest.fn().mockResolvedValue(account) },
  };
  const model: any = { db: { collection: jest.fn((n: string) => collections[n] || { findOne: jest.fn().mockResolvedValue(null) }) }, create: jest.fn() };
  const service: any = new NotificationsService(model, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  jest.spyOn(service, 'sendPush').mockResolvedValue(false as any);
  service.create = jest.fn().mockResolvedValue({ id: 'n1' });
  return { service, bell };
}
const LAB = { id: 'lab-1', provider_account_id: 'prov-acct' };

describe('patient cancel and reschedule reach the provider; provider reschedule reaches the patient', () => {
  it('a patient cancel adds a provider bell row of its own (the new-request row does not swallow it)', async () => {
    const { service, bell } = setup(LAB);
    await service.onServiceCancelled({ entity_type: 'lab_booking', entity_id: 'lab-1', actor_role: 'patient', patient_account_id: 'pat-1' });
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'pat-1', title_key: 'notif.service.cancelled.title' }));
    expect(bell.insertOne).toHaveBeenCalledWith(expect.objectContaining({ provider_account_id: 'prov-acct', type: 'request_cancelled', title_en: 'The patient cancelled the booking', related_type: 'lab_booking_cancelled' }));
  });

  it('a cancel by the provider or admin does not tell the provider about their own action', async () => {
    const { service, bell } = setup(LAB);
    await service.onServiceCancelled({ entity_type: 'lab_booking', entity_id: 'lab-1', actor_role: 'lab', patient_account_id: 'pat-1' });
    expect(bell.insertOne).not.toHaveBeenCalled();
  });

  it('a new time set by the patient tells the provider', async () => {
    const { service, bell } = setup(LAB);
    await service.onBookingRescheduled({ entity_type: 'lab_booking', entity_id: 'lab-1', actor_role: 'patient', patient_account_id: 'pat-1', meta: { new_date: '2026-12-01T09:00:00.000Z' } });
    expect(bell.insertOne).toHaveBeenCalledWith(expect.objectContaining({ provider_account_id: 'prov-acct', related_type: 'lab_booking_rescheduled_2026-12-01T09:00:00.000Z' }));
    expect(service.create).not.toHaveBeenCalled();
  });

  it('a new time set by the provider tells the patient, with the date', async () => {
    const { service, bell } = setup(LAB);
    await service.onBookingRescheduled({ entity_type: 'lab_booking', entity_id: 'lab-1', actor_role: 'lab', patient_account_id: 'pat-1', meta: { new_date: '2026-12-01T09:00:00.000Z' } });
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'pat-1', title_key: 'notif.booking_rescheduled.title', params: { date: '2026-12-01 09:00' } }));
    expect(bell.insertOne).not.toHaveBeenCalled();
  });
});
