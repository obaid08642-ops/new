import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SupportCategory } from '../../schemas/support.schema';
import { FeedbackDto } from './support.dto';
import { SupportService } from './support.service';

/**
 * POST /support/feedback used to answer { success: true } and keep nothing: the patient's words, rating and kind of
 * feedback were thrown away (patient-app walkthrough, settings/help?tab=feedback). It now files a support request.
 */
function serviceFor(faqRows: any[] = []) {
  const service: any = Object.create(SupportService.prototype);
  service.req = { create: jest.fn(async (doc: any) => ({ id: 'sup-1', tracking_id: 'SUP-0001', ...doc })) };
  service.conn = { collection: () => ({ find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => faqRows }) }) }) }) };
  return service;
}
const patient = { id: 'pat-1', full_name: 'Test Patient', phone: '+966500000001', role: 'patient' };

describe('POST /support/feedback keeps the patient feedback', () => {
  it('files the words as a support request with the patient, the kind and the rating', async () => {
    const service = serviceFor();
    const out = await service.submitFeedback(patient, { message: '  the booking page is slow  ', category: 'issue', rating: 'negative' });
    expect(out).toEqual({ success: true, id: 'sup-1', tracking_id: 'SUP-0001' });
    const saved = service.req.create.mock.calls[0][0];
    expect(saved).toMatchObject({ user_id: 'pat-1', category: SupportCategory.TECHNICAL, message: 'the booking page is slow', source_role: 'patient' });
    expect(saved.subject).toContain('issue');
    expect(saved.subject).toContain('negative');
    expect(saved.thread[0]).toMatchObject({ by: 'pat-1', message: 'the booking page is slow' });
  });

  it('understands the web payload (type + stars) and maps suggestion and complaint to their categories', async () => {
    const service = serviceFor();
    await service.submitFeedback(patient, { message: 'nice', type: 'suggestion', rating: 5 });
    await service.submitFeedback(patient, { message: 'bad', type: 'complaint', rating: 1 });
    await service.submitFeedback(patient, { message: 'thanks', category: 'praise' });
    const categories = service.req.create.mock.calls.map((c: any[]) => c[0].category);
    expect(categories).toEqual([SupportCategory.SUGGESTION, SupportCategory.COMPLAINT, SupportCategory.GENERAL]);
  });

  it('refuses an empty message', async () => {
    await expect(serviceFor().submitFeedback(patient, { message: '   ' })).rejects.toThrow('message required');
  });

  it('validates the body: a message is required and the rating is one of the known values', async () => {
    const ok = plainToInstance(FeedbackDto, { message: 'hi', rating: 'positive', category: 'praise' });
    expect(await validate(ok)).toHaveLength(0);
    const stars = plainToInstance(FeedbackDto, { message: 'hi', rating: 4, type: 'suggestion' });
    expect(await validate(stars)).toHaveLength(0);
    expect((await validate(plainToInstance(FeedbackDto, {}))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(FeedbackDto, { message: 'hi', rating: 'great' }))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(FeedbackDto, { message: 'x'.repeat(2001) }))).length).toBeGreaterThan(0);
  });
});

describe('GET /support/faqs invents nothing', () => {
  it('is empty until the admin writes FAQs, instead of two placeholder questions', async () => {
    expect(await serviceFor([]).getFaqs()).toEqual([]);
  });
  it('serves the admin FAQs in both languages', async () => {
    const rows = [{ id: 'f1', question_ar: 'س', answer_ar: 'ج', question_en: 'Q', answer_en: 'A' }];
    expect(await serviceFor(rows).getFaqs()).toEqual([{ id: 'f1', question: 'س', question_en: 'Q', answer: 'ج', answer_en: 'A' }]);
  });
});
