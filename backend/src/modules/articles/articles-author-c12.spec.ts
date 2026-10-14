import { ArticlesService } from './articles.module';

// OC-C C-12 (737/740): the public article payload carries author.doctor_id
// (public profile id for profile/booking links) and never account/phone/email.
function serviceFor(doc: any) {
  const service: any = Object.create(ArticlesService.prototype);
  service.model = {
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }),
    updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
  };
  return service as ArticlesService;
}

describe('OC C-12 public article author link', () => {
  it('exposes author.doctor_id without private fields', async () => {
    const doc = {
      id: 'art-1', slug: 'slug-1', status: 'PUBLISHED',
      title_ar: 'النوم الصحي', author_name: 'د. واحد',
      author: { doctor_id: 'doc-prof-1', doctor_name: 'د. واحد' },
    };
    const out: any = await serviceFor(doc).bySlug('slug-1');
    expect(out?.author?.doctor_id).toBe('doc-prof-1');
    const s = JSON.stringify(out);
    expect(s).not.toContain('doc-1');
    expect(s).not.toContain('@');
    expect(s).not.toContain('+966');
  });

  it('leaves legacy articles without an author untouched', async () => {
    const doc = { id: 'art-old', slug: 'old', status: 'PUBLISHED', title_ar: 'قديم', author_name: 'فريق نبض' };
    const out: any = await serviceFor(doc).bySlug('old');
    expect(out?.author).toBeUndefined();
  });
});
