import { ArticlesService } from './articles.module';

// P13-R15: health content shows author, medical reviewer with credentials,
// updated date and references; AI-generated content cannot publish without
// human review. Red on the base: publish() flips any DRAFT to PUBLISHED
// blindly, and the schema has no reviewer/references/ai_generated fields.
describe('P13-R15 medical content trust gate', () => {
  function svcWith(docs: Record<string, any> = {}) {
    const created: any[] = [];
    const updated: any[] = [];
    const model: any = {
      create: jest.fn(async (d: any) => { created.push(d); docs[d.id || `new-${created.length}`] = d; return d; }),
      findOne: jest.fn((q: any) => ({ lean: async () => docs[q?.id] || null })),
      findOneAndUpdate: jest.fn(async (f: any, u: any) => {
        updated.push({ f, u });
        const d = docs[f?.id];
        if (!d) return null;
        Object.assign(d, u?.$set || {});
        return d;
      }),
    };
    const svc = new ArticlesService(model, undefined);
    return { svc, model, created, updated };
  }

  it('an AI-generated article cannot publish without a named human reviewer', async () => {
    const { svc } = svcWith({
      a1: { id: 'a1', title_ar: 'س', author_name: 'د. س', ai_generated: true, status: 'DRAFT' },
    });
    await expect(svc.publish('a1')).rejects.toThrow('human_review_required');
  });

  it('an AI-generated article publishes once a credentialed reviewer signs it', async () => {
    const { svc } = svcWith({
      a1: {
        id: 'a1', title_ar: 'س', author_name: 'د. س', ai_generated: true,
        reviewer_name: 'د. م', reviewer_credentials: 'استشاري', status: 'DRAFT',
      },
    });
    const out: any = await svc.publish('a1');
    expect(out.status).toBe('PUBLISHED');
    expect(out.reviewed_at).toBeInstanceOf(Date);
  });

  it('an article without an author cannot publish', async () => {
    const { svc } = svcWith({ a1: { id: 'a1', title_ar: 'س', status: 'DRAFT' } });
    await expect(svc.publish('a1')).rejects.toThrow('author_required');
  });

  it('a human-written article with an author publishes', async () => {
    const { svc } = svcWith({ a1: { id: 'a1', title_ar: 'س', author_name: 'د. س', status: 'DRAFT' } });
    const out: any = await svc.publish('a1');
    expect(out.status).toBe('PUBLISHED');
  });

  it('references and the AI flag are stored at creation', async () => {
    const { svc, created } = svcWith();
    await svc.create({
      title_ar: 'س', author_name: 'د. س', ai_generated: true,
      references: [{ label: 'WHO', url: 'https://www.who.int/x' }],
    } as any);
    expect(created[0]).toMatchObject({
      ai_generated: true,
      references: [{ label: 'WHO', url: 'https://www.who.int/x' }],
    });
  });
});
