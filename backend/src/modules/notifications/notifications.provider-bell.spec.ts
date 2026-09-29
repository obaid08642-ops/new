import { NotificationsService } from './notifications.service';

describe('NotificationsService provider bell (LJ-07)', () => {
  function setup({ booking, account, existingBell }: { booking?: any; account?: any; existingBell?: any } = {}) {
    const bell = {
      findOne: jest.fn().mockResolvedValue(existingBell || null),
      insertOne: jest.fn().mockResolvedValue({}),
    };
    const collections: Record<string, any> = {
      provider_notifications: bell,
      appointments: { findOne: jest.fn().mockResolvedValue(booking || null) },
      provider_accounts: { findOne: jest.fn().mockResolvedValue(account || null) },
    };
    const model: any = {
      db: {
        collection: jest.fn((name: string) => collections[name] || { findOne: jest.fn().mockResolvedValue(null) }),
        model: jest.fn().mockReturnValue({ find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }),
      },
      create: jest.fn(),
    };
    const service = new NotificationsService(model, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    jest.spyOn(service, 'sendPush').mockResolvedValue(false as any);
    (service as any).create = jest.fn().mockResolvedValue({ id: 'n1' });
    return { service, model, bell, collections };
  }

  it('writes one bell row for the assigned doctor account with related booking, not a role broadcast', async () => {
    const { service, model, bell } = setup({
      booking: { id: 'appt-1', doctor_user_id: 'doctor-user-1' },
      account: { id: 'doctor-account-1', user_id: 'doctor-user-1' },
    });

    await service.onServiceAssigned({ entity_type: 'appointment', entity_id: 'appt-1', patient_account_id: 'patient-1' });

    expect(bell.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      provider_account_id: 'doctor-account-1',
      related_id: 'appt-1', related_type: 'appointment',
    }));
    expect(model.create).not.toHaveBeenCalledWith(expect.objectContaining({ role: 'provider' }));
  });

  it('notifies the named provider on booking request and skips provider-less broadcasts', async () => {
    const withDoctor = setup({
      booking: { id: 'appt-2', doctor_user_id: 'doctor-user-1' },
      account: { id: 'doctor-account-1', user_id: 'doctor-user-1' },
    });
    await withDoctor.service.onServiceRequestedTargeted({ entity_type: 'appointment', entity_id: 'appt-2' });
    expect(withDoctor.bell.insertOne).toHaveBeenCalled();

    const noProvider = setup({ booking: { id: 'appt-3' }, account: null });
    await noProvider.service.onServiceRequestedTargeted({ entity_type: 'appointment', entity_id: 'appt-3' });
    expect(noProvider.bell.insertOne).not.toHaveBeenCalled();
  });

  it('does not duplicate the bell row when the same job event fires twice', async () => {
    const { service, bell } = setup({
      booking: { id: 'appt-4', doctor_user_id: 'doctor-user-1' },
      account: { id: 'doctor-account-1', user_id: 'doctor-user-1' },
      existingBell: { id: 'bell-1' },
    });

    const result = await service.notifyBookingProvider({ entity_type: 'appointment', entity_id: 'appt-4' }, 'booking_update');

    expect(result).toEqual({ id: 'bell-1' });
    expect(bell.insertOne).not.toHaveBeenCalled();
  });

  it('notifies only provider participants on a new chat message', async () => {
    const { service, bell, collections } = setup({ account: { id: 'doctor-account-1', user_id: 'doctor-user-1' } });
    collections.provider_accounts.findOne.mockImplementation(async (q: any) => {
      const wanted = q?.$or?.[0]?.id;
      return wanted === 'doctor-user-1' ? { id: 'doctor-account-1', user_id: 'doctor-user-1' } : null;
    });

    await service.onChatMessageTargeted({
      thread_id: 'thread-1', msg_id: 'msg-1', sender_id: 'patient-1',
      participant_ids: ['patient-1', 'doctor-user-1'],
    });

    expect(bell.insertOne).toHaveBeenCalledTimes(1);
    expect(bell.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      provider_account_id: 'doctor-account-1', related_type: 'chat_message', related_id: 'msg-1',
    }));
  });

  it('sends the provider push with the bell text (it used to arrive with no title or body)', async () => {
    const { service } = setup();
    await service.notifyProviderAccount('acct-1', { type: 'new_request', title_ar: 'طلب جديد', title_en: 'New request', body_ar: 'لديك طلب', related_id: 'b1', related_type: 'booking' });
    expect(service.sendPush).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'acct-1', title: 'طلب جديد', body: 'لديك طلب' }));
  });
});
