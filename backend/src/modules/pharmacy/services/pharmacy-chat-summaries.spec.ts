import { PharmacyChatService } from './pharmacy-chat.service';

/** #525: a conversation in the list says which pharmacy it is with and what was said last. */
describe('pharmacy conversation summaries', () => {
  it('adds the pharmacy public name and a bounded preview of the newest visible message', async () => {
    const threads = [{ id: 't1', patient_account_id: 'p1', pharmacy_account_id: 'ph1', status: 'open' }];
    const db = { collection: () => ({ find: () => ({ toArray: async () => [{ user_id: 'ph1', display_name_ar: 'صيدلية النهدي', name_en: 'Nahdi' }] }) }) };
    const lastQuery: any[] = [];
    const svc: any = Object.create(PharmacyChatService.prototype);
    svc.threads = { find: () => ({ sort: () => ({ lean: async () => threads }) }), db };
    svc.messages = { findOne: (q: any, _p: unknown, o: any) => { lastQuery.push([q, o]); return { lean: async () => ({ text: 'x'.repeat(200), sender_role: 'pharmacy', createdAt: 'now' }) }; } };
    const out = await svc.listThreads({ id: 'p1', role: 'patient' });
    expect(out[0]).toMatchObject({ pharmacy_name_ar: 'صيدلية النهدي', pharmacy_name_en: 'Nahdi', last_message: { from: 'pharmacy', has_image: false, has_offer: false } });
    expect(out[0].last_message.text).toHaveLength(120);
    expect(lastQuery[0][0]).toEqual({ thread_id: 't1', blocked: { $ne: true } });
    expect(lastQuery[0][1]).toEqual({ sort: { createdAt: -1 } });
  });
});
