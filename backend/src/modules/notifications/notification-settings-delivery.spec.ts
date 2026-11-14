/** batch-0-web#16 and #9: the patient's switches decide the push and email of a notification, a doctor's chat message
 *  reaches the patient, and a notification also goes to the browsers the patient turned web push on in. */
import { NotificationsService } from './notifications.service';
import { NotificationPriority, NotificationType } from '../../common/enums';

const svcWith = (settings: any) => {
  const svc: any = Object.create(NotificationsService.prototype);
  svc.model = { db: { collection: () => ({ findOne: async () => (settings ? { notification_settings: settings } : null) }) } };
  return svc;
};

describe('the switches of Settings > Notifications decide push and email (batch-0-web#16)', () => {
  it('a category turned off stops its push and email; a channel turned off stops that channel only', async () => {
    const s = { channels: { push: true, email: false, sms: false }, categories: { orders: false, appointments: true, health: true, chat: false, account: true, marketing: false } };
    expect(await svcWith(s).deliveryPrefs({ user_id: 'u1', type: NotificationType.ORDER })).toEqual({ push: false, email: false });
    expect(await svcWith(s).deliveryPrefs({ user_id: 'u1', type: NotificationType.APPOINTMENT })).toEqual({ push: true, email: false });
    expect(await svcWith(s).deliveryPrefs({ user_id: 'u1', type: NotificationType.PROMO })).toEqual({ push: false, email: false });
    expect(await svcWith(s).deliveryPrefs({ user_id: 'u1', type: NotificationType.INFO, title_key: 'notif.chat_doctor.title' })).toEqual({ push: false, email: false });
  });

  it('emergencies, critical notices and patients without settings always get both', async () => {
    const off = { channels: { push: false, email: false }, categories: { orders: false } };
    expect(await svcWith(off).deliveryPrefs({ user_id: 'u1', type: NotificationType.EMERGENCY })).toEqual({ push: true, email: true });
    expect(await svcWith(off).deliveryPrefs({ user_id: 'u1', type: NotificationType.ORDER, priority: NotificationPriority.CRITICAL })).toEqual({ push: true, email: true });
    expect(await svcWith(null).deliveryPrefs({ user_id: 'u1', type: NotificationType.ORDER })).toEqual({ push: true, email: true });
  });
});

describe('the flat switches (#1819) also decide delivery', () => {
  const base = { channels: { push: true, email: true }, categories: {} };
  it('the master switch, medications and doctor messages stop push and email; emergencies still go out', async () => {
    const off = { push: false, email: false };
    expect(await svcWith({ ...base, preferences: { general: false } }).deliveryPrefs({ user_id: 'u1', type: NotificationType.ORDER })).toEqual(off);
    expect(await svcWith({ ...base, preferences: { medications: false } }).deliveryPrefs({ user_id: 'u1', type: NotificationType.MEDICATION })).toEqual(off);
    expect(await svcWith({ ...base, preferences: { medications: false } }).deliveryPrefs({ user_id: 'u1', type: NotificationType.ORDER })).toEqual({ push: true, email: true });
    expect(await svcWith({ ...base, preferences: { doctorMessages: false } }).deliveryPrefs({ user_id: 'u1', type: NotificationType.INFO, title_key: 'notif.chat_doctor.title' })).toEqual(off);
    expect(await svcWith({ ...base, preferences: { general: false } }).deliveryPrefs({ user_id: 'u1', type: NotificationType.EMERGENCY })).toEqual({ push: true, email: true });
  });
});

describe('the bell unread count', () => {
  it('counts what this user can see and has not read, in the list scope', async () => {
    const svc: any = Object.create(NotificationsService.prototype);
    svc.model = { countDocuments: jest.fn(async () => 7) };
    expect(await svc.unreadCount({ id: 'u1', role: 'patient' })).toEqual({ unread: 7 });
    expect(svc.model.countDocuments).toHaveBeenCalledWith({
      $and: [{ $or: [{ user_id: 'u1' }, { role: 'patient' }, { role: 'all' }] }, { read_by: { $ne: 'u1' } }],
    });
  });
});

describe('a doctor chat message reaches the patient (the "chat" switch has something to switch)', () => {
  it('notifies the patient of a consultation thread with a link to the appointment, and only the provider of a patient message', async () => {
    const svc: any = Object.create(NotificationsService.prototype);
    svc.model = { db: { model: () => ({ findOne: () => ({ lean: async () => ({ type: 'booking', booking_kind: 'consultation', booking_id: 'appt-1' }) }) }) } };
    svc.resolveProviderAccount = jest.fn(async (id: string) => (id === 'doc-1' ? 'doc-1' : null));
    svc.notifyProviderAccount = jest.fn(async () => undefined);
    svc.create = jest.fn(async () => undefined);
    await svc.onChatMessageTargeted({ thread_id: 't1', sender_id: 'doc-1', participant_ids: ['pat-1', 'doc-1'], body: 'hello' });
    expect(svc.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'pat-1', title_key: 'notif.chat_doctor.title', action: { route: '/consultations/appointments/appt-1' } }));
    svc.create.mockClear();
    await svc.onChatMessageTargeted({ thread_id: 't1', sender_id: 'pat-1', participant_ids: ['pat-1', 'doc-1'], body: 'hi' });
    expect(svc.create).not.toHaveBeenCalled();
    expect(svc.notifyProviderAccount).toHaveBeenCalled();
  });
});

describe('web push (batch-0-web#9)', () => {
  it('a notification also goes to the patient\'s subscribed browsers, opening the web page of its target', async () => {
    const svc: any = Object.create(NotificationsService.prototype);
    svc.model = { db: { model: () => ({ find: () => ({ lean: async () => [] }) }) } };
    svc.push = { sendWebToUser: jest.fn(async () => true) };
    const sent = await svc.sendPush({ user_id: 'pat-1', type: 'appointment', title: 'T', body: 'B', action: { route: '/consultations/appointments/appt-1' } });
    expect(sent).toBe(true);
    expect(svc.push.sendWebToUser).toHaveBeenCalledWith('pat-1', 'T', 'B', expect.objectContaining({ url: '/appointments/appt-1' }));
  });
});
