// Q82: requests that carry an image (insurance-card and prescription OCR) hold
// one patient's data. They must never be served from the shared response cache;
// the cache key had only a has-image flag, so a second patient received the
// first patient's OCR result.
import { AiGatewayService } from './ai-gateway.service';

const conn = () => ({
  collection: jest.fn().mockImplementation((name: string) => {
    if (name === 'featureflags') return { findOne: jest.fn().mockResolvedValue({ value: 'auto', purpose_overrides: {} }), updateOne: jest.fn() };
    if (name === 'ai_providers') {
      const provs = [{ key: 'gemini', enabled: true, api_key: 'k', model: 'm', priority: 1, daily_quota: 0, used_today: 0, usage_date: '' }];
      return {
        countDocuments: jest.fn().mockResolvedValue(1),
        find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(provs) }) }),
        findOne: jest.fn().mockResolvedValue(provs[0]),
        updateOne: jest.fn().mockResolvedValue({}),
      };
    }
    return { insertOne: jest.fn().mockResolvedValue({}), updateOne: jest.fn().mockResolvedValue({}) };
  }),
});

describe('AI gateway response cache (Q82)', () => {
  it('never serves one patient\'s image result to another', async () => {
    const s = new AiGatewayService(conn() as never);
    s.setTransportForTests(async (_p, o) => `{"member_name":"owner-of-${String(o.imageBase64)}"}`);
    const prompt = 'Extract member_name and national_id from this insurance card as JSON.';
    const a = await s.generate({ prompt, feature: 'insurance_ocr', imageBase64: 'PATIENT_A_CARD' });
    const b = await s.generate({ prompt, feature: 'insurance_ocr', imageBase64: 'PATIENT_B_CARD' });
    expect(a.text).toContain('owner-of-PATIENT_A_CARD');
    expect(b.text).toContain('owner-of-PATIENT_B_CARD');
    expect((b as { cached?: boolean }).cached).not.toBe(true);
  });

  it('keeps text-only answers for five minutes, not about fifty', async () => {
    const s = new AiGatewayService(conn() as never);
    let n = 0;
    s.setTransportForTests(async () => { n += 1; return 'answer'; });
    const now = Date.now();
    const spy = jest.spyOn(Date, 'now');
    spy.mockReturnValue(now);
    await s.generate({ prompt: 'translate: hello', feature: 'translation' });
    spy.mockReturnValue(now + 6 * 60_000);
    await s.generate({ prompt: 'translate: hello', feature: 'translation' });
    spy.mockRestore();
    expect(n).toBe(2);
  });
});
