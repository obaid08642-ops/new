import { NewsletterService } from './newsletter.module';
import { pickAttribution } from '../../common/attribution';
import { PharmacyOrderService } from '../pharmacy/services/pharmacy-order.service';
import { AdminAnalyticsService } from '../analytics/analytics.module';

// P17-17.5: newsletter signup with consent + double opt-in; UTM parameters on
// every campaign link with orders attributed to campaigns. Red on the base:
// no newsletter model/endpoints exist, and no order carries UTM fields.
describe('P17-17.5 newsletter double opt-in and UTM attribution', () => {
  function newsletterWith(opts: { subs?: any[]; sent?: any[] } = {}) {
    const subs: any[] = opts.subs || [];
    const sent: any[] = opts.sent || [];
    const col = {
      findOne: jest.fn(async (q: any) => subs.find((s: any) => (q.email && s.email === q.email) || (q.confirm_token_hash && s.confirm_token_hash === q.confirm_token_hash)) || null),
      updateOne: jest.fn(async (f: any, u: any, o: any) => {
        const at = subs.findIndex((s: any) => s.email === f?.email);
        const doc = { ...(at >= 0 ? subs[at] : {}), ...u?.$setOnInsert, ...u?.$set };
        for (const k of Object.keys(u?.$unset || {})) delete (doc as any)[k];
        if (at >= 0) subs[at] = doc; else subs.push(doc);
        return { upsertedCount: 1 };
      }),
    };
    const conn: any = { collection: jest.fn(() => col) };
    const mail: any = { send: jest.fn(async (to: string, subject: string, html: string) => { sent.push({ to, subject, html }); return { ok: true }; }) };
    const svc = new NewsletterService(conn, mail);
    return { svc, col, subs, sent };
  }

  it('subscribe stores a pending subscription and sends a confirm link, nothing else', async () => {
    const { svc, subs, sent } = newsletterWith();
    const out: any = await svc.subscribe({ email: 'USER@Example.com', locale: 'ar' } as any);
    expect(out).toMatchObject({ status: 'pending' });
    expect(subs[0]).toMatchObject({ email: 'user@example.com', status: 'pending' });
    expect(subs[0].confirm_token_hash).toBeTruthy();
    expect(subs[0]).not.toHaveProperty('confirm_token');
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('user@example.com');
    expect(sent[0].html).toContain('/newsletter/confirm?token=');
  });

  it('unknown tokens fail; expired tokens fail even with the right value', async () => {
    const { svc, subs, sent } = newsletterWith();
    await svc.subscribe({ email: 'a@x.com' } as any);
    await expect((svc as any).confirmWithToken('nope')).rejects.toThrow('invalid_token');
    const m = String(sent[0].html).match(/token=([a-f0-9]+)/);
    expect(m).toBeTruthy();
    subs[0].token_expires_at = new Date(Date.now() - 1000);
    await expect((svc as any).confirmWithToken(m![1])).rejects.toThrow('link_expired');
  });

  it('confirming with the issued token activates the subscription', async () => {
    const { svc, subs } = newsletterWith();
    const issued: string[] = [];
    const origSend = (svc as any).mailer.send;
    (svc as any).mailer.send = jest.fn(async (to: string, s: string, h: string) => {
      const m = String(h).match(/token=([a-f0-9]+)/);
      if (m) issued.push(m[1]);
      return origSend(to, s, h);
    });
    await svc.subscribe({ email: 'c@x.com' } as any);
    expect(issued).toHaveLength(1);
    const out: any = await (svc as any).confirmWithToken(issued[0]);
    expect(out).toMatchObject({ status: 'active' });
    expect(subs[0].status).toBe('active');
    await expect((svc as any).confirmWithToken(issued[0])).rejects.toThrow();
  });

  it('resending confirmations is capped per address per day', async () => {
    const { svc, sent } = newsletterWith();
    await svc.subscribe({ email: 'd@x.com' } as any);
    await svc.subscribe({ email: 'd@x.com' } as any);
    await svc.subscribe({ email: 'd@x.com' } as any);
    await expect(svc.subscribe({ email: 'd@x.com' } as any)).rejects.toThrow('too_many_requests');
    expect(sent.length).toBeLessThanOrEqual(3);
  });

  it('pickAttribution keeps only known UTM fields, trimmed and capped', () => {
    expect(pickAttribution({ utm_source: ' chat.openai.com ', utm_medium: 'cpc', utm_campaign: 'ramadan', utm_term: 'x'.repeat(500), evil: '1', __proto__: 'p' } as any)).toEqual({
      utm_source: 'chat.openai.com', utm_medium: 'cpc', utm_campaign: 'ramadan', utm_term: 'x'.repeat(200),
    });
    expect(pickAttribution({} as any)).toBeNull();
    expect(pickAttribution(undefined as any)).toBeNull();
  });

  it('a pharmacy order stores the campaign attribution it was created with', async () => {
    const created: any[] = [];
    const orders = { create: jest.fn(async (d: any) => { created.push(d); return { ...d, toObject: () => ({ ...d }) }; }) };
    const engine = { announceCreated: jest.fn(async () => null) };
    const conn: any = { collection: jest.fn(() => ({ find: jest.fn(() => ({ toArray: async () => [] })) })) };
    const svc = new PharmacyOrderService(orders as any, {} as any, {} as any, {} as any, {} as any, {} as any, engine as any, conn);
    await svc.create(
      { id: 'pat-1', role: 'patient' } as any,
      { items: [{ raw_name: 'Panadol', qty: 2 }], utm_source: 'chat.openai.com', utm_campaign: 'ramadan' } as any,
    );
    expect(created[0].attribution).toEqual({ utm_source: 'chat.openai.com', utm_campaign: 'ramadan' });
  });

  it('the campaign report unions attributed orders across verticals', async () => {
    const docs: Record<string, any[]> = {
      pharmacy_orders: [{ id: 'o1', total: 50, status: 'paid', createdAt: new Date(), attribution: { utm_campaign: 'ramadan' } }],
      lab_bookings: [],
      radiology_bookings: [{ id: 'r1', total_price: 120, state: 'done', createdAt: new Date(), attribution: { utm_campaign: 'ramadan' } }],
      home_care_bookings: [],
      appointments: [{ id: 'a1', total_price: 200, status: 'completed', createdAt: new Date(), attribution: { utm_campaign: 'other' } }],
    };
    const conn: any = {
      collection: jest.fn((name: string) => ({
        find: jest.fn((q: any) => ({
          sort: () => ({
            limit: () => ({
              toArray: async () => (docs[name] || []).filter((d: any) =>
                !q?.['attribution.utm_campaign'] || d?.attribution?.utm_campaign === q['attribution.utm_campaign']),
            }),
          }),
        })),
      })),
    };
    const svc = new AdminAnalyticsService(conn);
    const out: any = await svc.campaignReport('ramadan', 30, 100);
    expect(out.total).toBe(2);
    expect(out.by_vertical).toMatchObject({ pharmacy: 1, radiology: 1, lab: 0, nursing: 0, consultation: 0 });
    expect(out.orders.map((o: any) => o.id).sort()).toEqual(['o1', 'r1']);
  });

  it('the campaign report requires a campaign name', async () => {
    const conn: any = { collection: jest.fn() };
    const svc = new AdminAnalyticsService(conn);
    await expect(svc.campaignReport('', 30, 100)).rejects.toThrow('campaign_required');
  });
});
