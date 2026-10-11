import { LegalService } from './legal.module';

// OC-C C-18 (753/796): policies carry ur/hi/bn/fil content with EN fallback.
function serviceFor(policies: any[]) {
  const service: any = Object.create(LegalService.prototype);
  service.conn = {
    collection: jest.fn(() => ({
      findOne: jest.fn().mockImplementation(async (q: any) => policies.find((p) => p.key === q?.key) ?? null),
    })),
  };
  return service as LegalService;
}

const POLICY: any = {
  key: 'privacy_policy', title_ar: 'الخصوصية', title_en: 'Privacy', version: '1.0',
  content_ar: 'نص عربي', content_en: 'English text',
  content_ur: 'اردو متن',
};

describe('OC C-18 policy languages', () => {
  it('serves the requested language content', async () => {
    const svc = serviceFor([POLICY]);
    expect((await svc.getPolicy('privacy_policy', 'ur'))?.content).toContain('اردو متن');
    expect((await svc.getPolicy('privacy_policy', 'ar'))?.content).toContain('نص عربي');
  });

  it('falls back to English, then Arabic, for untranslated languages', async () => {
    const svc = serviceFor([POLICY]);
    const hi: any = await svc.getPolicy('privacy_policy', 'hi');
    expect(hi.content).toContain('English text');
    expect(hi.language).toBe('en');
  });
});
