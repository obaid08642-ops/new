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
    const service = new NotificationsService(model, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
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
    const svc = new NotificationsService({} as any, templateModel, {} as any, {} as any, {} as any, {} as any, {} as any);
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
    return new NotificationsService({} as any, templateModel, {} as any, {} as any, {} as any, {} as any, i18n);
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
    const svc = new NotificationsService({} as any, templateModel, {} as any, {} as any, {} as any, {} as any, {} as any);
    await expect(svc.resolveNotificationText({ title_key: 'k.t', body_key: 'k.b' }, 'ar'))
      .resolves.toEqual({ title: 'k.t', body: 'k.b' });
  });
});
