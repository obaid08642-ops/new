import { SupportService } from './support.service';

// issue 1585: the built-in FAQ fallback (empty `faqs` collection) carries all six languages in the stored-FAQ shape.
const LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];
const ARABIC = /[؀-ۿ]/;

function serviceFor(rows: unknown[]) {
  const service: any = Object.create(SupportService.prototype);
  service.conn = { collection: jest.fn(() => ({ find: jest.fn(() => ({ sort: jest.fn(() => ({ limit: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue(rows) })) })) })) })) };
  return service as SupportService;
}

describe('issue 1585 FAQ fallback languages', () => {
  it('fills question/answer for every language when no FAQ is stored', async () => {
    const out: any[] = await serviceFor([]).getFaqs();
    expect(out.length).toBeGreaterThan(0);
    for (const faq of out) {
      for (const lang of LANGS) {
        expect(String(faq[`question_${lang}`] || '').trim()).not.toBe('');
        expect(String(faq[`answer_${lang}`] || '').trim()).not.toBe('');
      }
      expect(faq.question).toBe(faq.question_ar);
      for (const lang of ['en', 'hi', 'bn', 'fil']) {
        expect(ARABIC.test(faq[`question_${lang}`])).toBe(false);
        expect(ARABIC.test(faq[`answer_${lang}`])).toBe(false);
      }
    }
  });

  it('keeps the stored-FAQ shape for real rows', async () => {
    const out: any[] = await serviceFor([{ id: 'f1', question_ar: 'س', question_en: 'Q', answer_ar: 'ج', answer_en: 'A' }]).getFaqs();
    expect(out).toEqual([{ id: 'f1', question: 'س', question_en: 'Q', answer: 'ج', answer_en: 'A' }]);
  });
});
