import { NotificationsService } from './notifications.service';

// R8: a lab booking with a facility id that is no provider account still reaches the lab through provider_account_id.
describe('notifyBookingProvider resolves the first real provider account', () => {
  it('skips a facility id that is not an account', async () => {
    const svc: any = Object.create(NotificationsService.prototype);
    const accounts = [{ id: 'lab-acc' }];
    svc.model = { db: { collection: (name: string) => ({
      findOne: async (f: any) => name === 'labbookings'
        ? { id: 'b1', facility_id: 'branch-9', provider_account_id: 'lab-acc' }
        : accounts.find((a) => (f.$or || []).some((o: any) => o.id === a.id || o.user_id === a.id)) ?? null,
    }) } };
    svc.notifyProviderAccount = jest.fn(async () => ({ ok: true }));
    svc.routeKind = () => 'lab';
    await svc.notifyBookingProvider({ entity_type: 'lab_booking', entity_id: 'b1' }, 'new_request');
    expect(svc.notifyProviderAccount).toHaveBeenCalledWith('lab-acc', expect.objectContaining({ related_id: 'b1' }));
  });
});
