import { SupportService } from './support.service';

// issue 1585: stored FAQs keep their shape; with none stored the list is empty (no invented questions, main's rule).
function serviceFor(rows: unknown[]) {
  const service: any = Object.create(SupportService.prototype);
  service.conn = { collection: jest.fn(() => ({ find: jest.fn(() => ({ sort: jest.fn(() => ({ limit: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue(rows) })) })) })) })) };
  return service as SupportService;
}

describe('issue 1585 FAQ list', () => {
  it('lists nothing when no FAQ is stored (no built-in questions)', async () => {
    expect(await serviceFor([]).getFaqs()).toEqual([]);
  });

  it('keeps the stored-FAQ shape for real rows', async () => {
    const out: any[] = await serviceFor([{ id: 'f1', question_ar: 'س', question_en: 'Q', answer_ar: 'ج', answer_en: 'A' }]).getFaqs();
    expect(out).toEqual([{ id: 'f1', question: 'س', question_en: 'Q', answer: 'ج', answer_en: 'A' }]);
  });
});
