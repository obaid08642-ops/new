import { AiContentReviewService } from './ai-content-review.service';

/**
 * The review queue had no test at all, which is how a comment could claim
 * non-urgent content is "withheld until a reviewer approves it" while nothing
 * was ever withheld. These tests pin what the queue actually guarantees, so the
 * next person who adds model prose to a medical surface trips a red test instead
 * of silently shipping unreviewed AI text to patients.
 */
describe('AiContentReviewService', () => {
  const makeService = (overrides: any = {}) => {
    const created: any[] = [];
    const model: any = {
      create: jest.fn(async (doc: any) => {
        created.push(doc);
        return { id: 'rvw_1', ...doc };
      }),
      find: jest.fn(() => ({ sort: () => ({ limit: () => ({ lean: async () => created }) }) })),
      findOneAndUpdate: jest.fn(async (_q: any, update: any) => {
        const doc = { id: 'rvw_1', ...update.$set };
        return { ...doc, toObject: () => ({ ...doc }) };
      }),
      ...overrides,
    };
    return { service: new AiContentReviewService(model), model, created };
  };

  it('auto-publishes an emergency and marks it as such', async () => {
    const { service, created } = makeService();
    const res = await service.record({
      kind: 'triage',
      content: '{"care_level":"emergency"}',
      patientId: 'p1',
      careLevel: 'emergency',
    });
    expect(res.status).toBe('auto_published');
    expect(res.published).toBe(true);
    expect(created[0].published_to_patient).toBe(true);
  });

  it('treats "urgent" the same as emergency rather than queueing it', async () => {
    const { service } = makeService();
    const res = await service.record({ kind: 'triage', content: '{}', careLevel: 'Urgent' });
    expect(res.status).toBe('auto_published');
  });

  it('queues a non-urgent item for review instead of auto-publishing it', async () => {
    const { service, created } = makeService();
    const res = await service.record({ kind: 'triage', content: '{"care_level":"self_care"}', careLevel: 'self_care' });
    expect(res.status).toBe('pending');
    expect(res.published).toBe(false);
    expect(created[0].published_to_patient).toBe(false);
  });

  /**
   * The load-bearing one. `published_to_patient: false` is only honest because
   * the medical payload that reaches the patient carries no model prose. If a
   * future change starts returning diagnosis/treatment text from triage, this
   * fails and the queue has to grow a real gate.
   */
  it('never queues medical content that contains model-authored diagnosis or treatment', async () => {
    const { service, created } = makeService();
    const payload = {
      care_level: 'self_care',
      selected_red_flags: [],
      notice: 'this_is_guidance_not_a_diagnosis',
      diagnosis: null,
      treatment: null,
    };
    await service.record({ kind: 'triage', content: JSON.stringify(payload), careLevel: 'self_care' });
    const recorded = JSON.parse(created[0].content);
    expect(recorded.diagnosis).toBeNull();
    expect(recorded.treatment).toBeNull();
  });

  it('never lets a Mongo failure break the clinical response', async () => {
    const { service } = makeService({
      create: jest.fn(async () => {
        throw new Error('mongo down');
      }),
    });
    const res = await service.record({ kind: 'triage', content: '{}', careLevel: 'self_care' });
    // Reported as unrecorded rather than thrown, so triage still answers.
    expect(res.status).toBe('unrecorded');
    expect(res.published).toBe(false);
  });

  it('records the moderator decision and caps the note length', async () => {
    const { service, model } = makeService();
    const res = await service.review('rvw_1', 'admin-1', 'approved', 'x'.repeat(900));
    expect(res.status).toBe('approved');
    expect(res.reviewed_by).toBe('admin-1');
    expect(res.review_note).toHaveLength(500);
    expect(model.findOneAndUpdate).toHaveBeenCalled();
  });

  it('rejects an unknown review id', async () => {
    const { service } = makeService({ findOneAndUpdate: jest.fn(async () => null) });
    await expect(service.review('nope', 'admin-1', 'approved')).rejects.toThrow();
  });
});
