import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService ownership', () => {
  it('scopes markRead to the notification owner or role and fails closed for foreign ids', async () => {
    const model: any = { updateOne: jest.fn().mockResolvedValue({ matchedCount: 0 }) };
    const service = new NotificationsService(
      model,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(service.markRead('notification-foreign', { id: 'patient-2', role: 'patient' }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(model.updateOne).toHaveBeenCalledWith(
      { id: 'notification-foreign', $or: [{ user_id: 'patient-2' }, { role: 'patient' }, { role: 'all' }] },
      { $addToSet: { read_by: 'patient-2' } },
    );
  });

  it('accepts a matched notification and returns ok', async () => {
    const model: any = { updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }) };
    const service = new NotificationsService(model, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    await expect(service.markRead('notification-owned', { id: 'patient-1', role: 'patient' })).resolves.toEqual({ ok: true });
  });
});

describe('NotificationsService templates', () => {
  const make = (tpl: any = null) => {
    const templateModel: any = {
      find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }),
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) }),
      findOneAndUpdate: jest.fn().mockResolvedValue({ toObject: () => ({ key: 'k', title: {}, body: {} }) }),
    };
    const svc = new NotificationsService({} as any, templateModel, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    (svc as any).create = jest.fn().mockResolvedValue({ id: 'n1' });
    return { svc, templateModel };
  };

  it('rejects bad keys and strips non-lang fields', async () => {
    const { svc, templateModel } = make();
    await expect(svc.upsertTemplate({ id: 'a' }, { key: 'bad key!' })).rejects.toThrow();
    await svc.upsertTemplate({ id: 'a' }, { key: 'appt.reminder', title: { ar: 'x', xx: 'y', __proto__: 'z' }, body: { ar: 'b {{name}}' } });
    const setArg = templateModel.findOneAndUpdate.mock.calls[0][1].$set;
    expect(setArg.title).toEqual({ ar: 'x' });
  });

  it('preview renders params and test-send creates a notification', async () => {
    const { svc } = make({ key: 'k', title: { ar: 'A {{name}}' }, body: { ar: 'B' } });
    const p: any = await svc.previewTemplate('k', 'ar', { name: 'N' });
    expect(p.title).toBe('A N');
    const t: any = await svc.testSendTemplate({ id: 'a1' }, 'k', 'ar', {});
    expect(t).toEqual({ id: 'n1' });
  });
});

describe('NotificationsService template resolution (R6-3)', () => {
  const svcFor = (tpl: any) => {
    const templateModel: any = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) }) };
    const i18n: any = { t: jest.fn((key: string) => `built-in:${key}`) };
    return new NotificationsService({} as any, templateModel, {} as any, {} as any, {} as any, {} as any, i18n, {} as any);
  };

  it('uses the edited template text in the user language with param fill', async () => {
    const svc = svcFor({ key: 'notif.x.title', active: true, title: { ar: 'مخصص {{name}}' }, body: { ar: 'نص' } });
    await expect(svc.resolveNotificationText(
      { title_key: 'notif.x.title', body_key: 'notif.x.body', params: { name: 'N' } }, 'ar',
    )).resolves.toEqual({ title: 'مخصص N', body: 'نص' });
  });

  it('falls back to built-in text when no active template matches', async () => {
    const svc = svcFor(null);
    await expect(svc.resolveNotificationText({ title_key: 'k.t', body_key: 'k.b', params: {} }, 'ar'))
      .resolves.toEqual({ title: 'built-in:k.t', body: 'built-in:k.b' });
  });

  it('falls back when the template store is unreachable', async () => {
    const templateModel: any = { findOne: jest.fn().mockImplementation(() => { throw new Error('down'); }) };
    const svc = new NotificationsService({} as any, templateModel, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    await expect(svc.resolveNotificationText({ title_key: 'k.t', body_key: 'k.b' }, 'ar'))
      .resolves.toEqual({ title: 'k.t', body: 'k.b' });
  });
});

describe('NotificationsService delivery channels (N5)', () => {
  it('sends email once when a user has both phone and email', async () => {
    const notification = {
      id: 'n1',
      user_id: 'user-1',
      title_key: 'title',
      body_key: 'body',
      params: {},
      delivery: {},
      toObject() { return { id: this.id, user_id: this.user_id, title_key: this.title_key, body_key: this.body_key, params: this.params, delivery: this.delivery }; },
    };
    const user = { id: 'user-1', email: 'user@example.com', phone: '+966500000000', lang: 'ar' };
    const model: any = {
      findOne: jest.fn().mockResolvedValue(notification),
      updateOne: jest.fn().mockResolvedValue({}),
      db: { model: () => ({ findOne: () => ({ lean: async () => user }) }) },
    };
    const templateModel: any = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) };
    const i18n: any = { t: jest.fn((key: string) => key) };
    const svc = new NotificationsService(model, templateModel, {} as any, {} as any, {} as any, {} as any, i18n, {} as any);
    const sendPush = jest.spyOn(svc, 'sendPush').mockResolvedValue(true);
    const sendEmail = jest.spyOn(svc, 'sendEmail').mockResolvedValue(undefined);
    const sendWhatsApp = jest.spyOn(svc, 'sendWhatsApp').mockResolvedValue(undefined);

    await svc.deliverById('n1');

    expect(sendPush).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendWhatsApp).toHaveBeenCalledTimes(1);
    expect(model.updateOne).toHaveBeenCalledWith(
      { id: 'n1' },
      expect.objectContaining({ $set: expect.objectContaining({ delivery: expect.objectContaining({ email: expect.objectContaining({ status: 'SENT' }) }) }) }),
    );
  });
});

describe('NotificationsService delivery queue (F33)', () => {
  it('enqueues with a job id BullMQ accepts, so delivery keeps its retry and delay', async () => {
    const { Job } = require('bullmq');
    const queueStub: any = { name: 'notifications-delivery', keys: {}, toKey: (t: string) => t, opts: {}, qualifiedName: 'bull:notifications-delivery' };
    const queue: any = {
      // Same validation BullMQ runs when a job is added: a bad custom id throws here.
      add: jest.fn(async (name: string, data: any, opts: any) => new Job(queueStub, name, data, opts).validateOptions({})),
    };
    const svc = new NotificationsService({} as any, {} as any, {} as any, {} as any, {} as any, queue, {} as any, {} as any);
    const direct = jest.spyOn(svc as any, 'deliverById').mockResolvedValue(undefined);
    await (svc as any).enqueueDelivery('0b9d5a2e-7f1c-4c55-9a0e-2f6b1c3d4e5f', 60000);
    expect(queue.add).toHaveBeenCalledWith('deliver', { id: '0b9d5a2e-7f1c-4c55-9a0e-2f6b1c3d4e5f' }, expect.objectContaining({ jobId: 'deliver-0b9d5a2e-7f1c-4c55-9a0e-2f6b1c3d4e5f', delay: 60000 }));
    expect(direct).not.toHaveBeenCalled();
  });
});
