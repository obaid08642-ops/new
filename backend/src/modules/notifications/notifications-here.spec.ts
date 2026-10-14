/** #417/#443 language, read_by not leaked; #1078 missed dose reaches allowed family; #939 provider decisions. */
import { NotificationsService } from './notifications.service';
import { I18nService } from '../i18n/i18n.service';

const svcWith = (opts: { rows?: any[]; group?: any } = {}) => {
  const svc: any = Object.create(NotificationsService.prototype);
  svc.i18n = new I18nService();
  svc.model = {
    find: () => ({ sort: () => ({ limit: async () => opts.rows ?? [] }) }),
    db: { collection: (name: string) => (name === 'family_groups' ? { findOne: async () => opts.group ?? null } : { findOne: async () => null, insertOne: async () => undefined }) },
  };
  svc.create = jest.fn(async () => undefined);
  svc.notifyProviderAccount = jest.fn(async () => undefined);
  return svc;
};

describe('notification list language (#417/#443)', () => {
  it('picks ar/ur as asked, English for the other app languages, Arabic when nothing is sent', () => {
    expect(NotificationsService.listLang('ur')).toBe('ur');
    expect(NotificationsService.listLang(undefined, 'en-US,en;q=0.9')).toBe('en');
    expect(NotificationsService.listLang('hi')).toBe('en');
    expect(NotificationsService.listLang('fil')).toBe('en');
    expect(NotificationsService.listLang()).toBe('ar');
  });

  it('writes the texts in that language and never returns other accounts in read_by', async () => {
    const svc = svcWith({ rows: [{ id: 'n1', role: 'patient', title_key: 'notif.order_created.title', body_key: 'notif.order_created.body', read_by: ['me', 'someone-else'] }] });
    const [row] = await svc.listForUser({ id: 'me', role: 'patient' }, 'en');
    expect(row.title).toBe('Order Created');
    expect(row.read).toBe(true);
    expect(row.read_by).toBeUndefined();
  });
});

describe('missed dose (#1078)', () => {
  const group = { owner_id: 'owner', members: [
    { user_id: 'pat', display_name: 'Sara', permissions: [] },
    { user_id: 'meds-ok', permissions: ['meds'] },
    { user_id: 'no-perm', permissions: ['booking'] },
  ] };

  it('notifies the patient, the group owner and members with meds/view_health only', async () => {
    const svc = svcWith({ group });
    await svc.onMissed({ patient_id: 'pat' });
    const to = svc.create.mock.calls.map((c: any[]) => c[0].user_id);
    expect(to.sort()).toEqual(['meds-ok', 'owner', 'pat']);
    const fam = svc.create.mock.calls.find((c: any[]) => c[0].user_id === 'owner')[0];
    expect(fam).toMatchObject({ title_key: 'notif.family_medication_missed.title', params: { name: 'Sara' } });
  });

  it('without a family group only the patient is told', async () => {
    const svc = svcWith();
    await svc.onMissed({ patient_id: 'pat' });
    expect(svc.create).toHaveBeenCalledTimes(1);
  });
});

describe('provider decisions (#939)', () => {
  it('approval, rejection and change requests reach the provider bell in Arabic and English', async () => {
    const svc = svcWith();
    await svc.onProviderApproved({ provider_id: 'acc-1' });
    await svc.onProviderRejected({ provider_id: 'acc-1' });
    await svc.onProviderChangesRequested({ provider_id: 'acc-1' });
    expect(svc.create).toHaveBeenCalledTimes(3);
    const bells = svc.notifyProviderAccount.mock.calls.map((c: any[]) => c[1]);
    expect(bells.map((b: any) => b.title_en)).toEqual(['Your account is approved', 'Your account was not approved', 'Changes needed on your application']);
    for (const b of bells) expect(b.title_ar).not.toMatch(/^notif\./);
  });
});

describe('every notification key the server sends has a text', () => {
  it('no raw key reaches a user', () => {
    const i18n = new I18nService();
    for (const k of ['notif.service.started.title', 'pharmacy.broadcast.body', 'notif.refund_decided.title', 'notif.report_ready.body']) {
      for (const lang of ['ar', 'en', 'ur'] as const) expect(i18n.t(k, lang)).not.toBe(k);
    }
  });
});

describe('every title_key / body_key literal in the backend is in the dictionary', () => {
  it('scans the source', () => {
    const fs = require('fs');
    const path = require('path');
    const i18n = new I18nService();
    const missing: string[] = [];
    const walk = (dir: string) => {
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (f.endsWith('.ts') && !f.endsWith('.spec.ts')) {
          for (const m of fs.readFileSync(full, 'utf8').matchAll(/(?:title_key|body_key): '([a-z0-9_]+\.[a-z0-9_.]+)'/g)) {
            if (m[1] !== 'notif.x.title' && m[1] !== 'notif.x.body' && i18n.t(m[1], 'en') === m[1]) missing.push(`${path.relative(__dirname, full)}: ${m[1]}`);
          }
        }
      }
    };
    walk(path.resolve(__dirname, '..', '..'));
    expect(missing).toEqual([]);
  });
});
