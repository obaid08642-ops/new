import { LegalService } from './legal.module';

// Owner 2026-10-12 (753/796): Arabic for an Arabic app, English for every other language.
function serviceFor(policy: any) {
  const service: any = Object.create(LegalService.prototype);
  service.conn = { collection: () => ({ findOne: jest.fn(async () => policy) }) };
  return service as LegalService;
}

const POLICY: any = { key: 'privacy_policy', title_ar: 'الخصوصية', title_en: 'Privacy', version: '1.0', content_ar: 'نص عربي', content_en: 'English text' };

describe('policy language: Arabic or English', () => {
  it('serves Arabic to ar and English to every other language', async () => {
    const svc = serviceFor(POLICY);
    expect(await svc.getPolicy('privacy_policy', 'ar')).toMatchObject({ content: 'نص عربي', title: 'الخصوصية', language: 'ar' });
    for (const lang of ['en', 'ur', 'hi', 'bn', 'fil']) {
      expect(await svc.getPolicy('privacy_policy', lang)).toMatchObject({ content: 'English text', title: 'Privacy', language: 'en' });
    }
  });

  it('falls back to the other language when one is missing', async () => {
    expect(await serviceFor({ ...POLICY, content_en: '' }).getPolicy('privacy_policy', 'ur')).toMatchObject({ content: 'نص عربي', language: 'ar' });
    expect(await serviceFor({ ...POLICY, content_ar: '' }).getPolicy('privacy_policy', 'ar')).toMatchObject({ content: 'English text', language: 'en' });
  });
});
