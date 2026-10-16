import { SeoSearchService } from './seo-search.module';

// P13-R8: internal links on public pages come only from real, governed edges.
// Red on the base: medicine/doctor recommendations filter only `is_deleted`
// (medicines) or nothing at all (doctors), so unpublished or suspended
// entities are linked from public pages.
//
// The collection double below emulates Mongo matching for the operators the
// queries use (equality, $ne, $or); text $regex conditions accept (every row
// here matches the text term by construction).
describe('P13-R8 recommendations link governed entities only', () => {
  function governsOk(row: any, q: any): boolean {
    if (!q || typeof q !== 'object') return true;
    for (const [k, v] of Object.entries(q)) {
      if (k === '$or') { if (!((v as any[]).some((c) => governsOk(row, c)))) return false; continue; }
      if (k === '$and') { if (!((v as any[]).every((c) => governsOk(row, c)))) return false; continue; }
      if (v && typeof v === 'object') {
        if ('$ne' in (v as any)) { if ((row as any)[k] === (v as any).$ne) return false; continue; }
        if ('$regex' in (v as any)) continue;
      }
      if ((row as any)[k] !== v) return false;
    }
    return true;
  }

  function col(docs: any[], seen: any[] = []) {
    const chain: any = {
      sort: () => chain,
      limit: () => ({ toArray: async () => docs.filter((d) => governsOk(d, (chain as any).q)) }),
    };
    return {
      findOne: jest.fn(async (q: any) => docs.find((d) => governsOk(d, q)) || null),
      find: jest.fn((q: any) => { seen.push(q); (chain as any).q = q; return chain; }),
    };
  }

  function svcWith(medDocs: any[], docDocs: any[], medSeen: any[] = [], docSeen: any[] = []) {
    const cols: any = { medicines: col(medDocs, medSeen), provider_profiles: col(docDocs, docSeen) };
    return new SeoSearchService({ collection: jest.fn((n: string) => cols[n]) } as any);
  }

  const GOV_MED = { public_eligibility: true, medical_review_status: 'approved' };
  const GOV_DOC = { ...GOV_MED, status: 'active', type: 'doctor' };

  it('an unpublished medicine gets no recommendations', async () => {
    const medSeen: any[] = [];
    const svc = svcWith(
      [{ id: 'm-x', active_ingredient: 'Paracetamol', category: 'c', sub_category: 's', public_eligibility: false, medical_review_status: 'pending' }],
      [], medSeen, [],
    );
    const out: any = await svc.medicineRecommendations('m-x', 12);
    expect(out).toEqual({ strategy: 'none', items: [] });
    expect(medSeen).toHaveLength(0);
  });

  it('an unpublished candidate is never recommended', async () => {
    const medSeen: any[] = [];
    const svc = svcWith(
      [
        { id: 'm-1', active_ingredient: 'Paracetamol', category: 'c', sub_category: 's', ...GOV_MED },
        { id: 'm-2', active_ingredient: 'Paracetamol', category: 'c', sub_category: 's', public_eligibility: false, medical_review_status: 'pending' },
        { id: 'm-3', active_ingredient: 'Paracetamol', category: 'c', sub_category: 's', ...GOV_MED },
      ],
      [], medSeen, [],
    );
    const out: any = await svc.medicineRecommendations('m-1', 12);
    const ids = out.items.map((i: any) => i.id);
    expect(ids).not.toContain('m-2');
    expect(ids).toContain('m-3');
    expect(medSeen.length).toBeGreaterThan(0);
    for (const q of medSeen) {
      expect(q).toMatchObject({ public_eligibility: true, medical_review_status: 'approved' });
    }
  });

  it('a suspended doctor gets no recommendations', async () => {
    const docSeen: any[] = [];
    const svc = svcWith(
      [],
      [{ id: 'd-x', provider_type: 'doctor', specialty: 'cardiology', city: 'Jeddah', status: 'suspended', public_eligibility: false, medical_review_status: 'pending' }],
      [], docSeen,
    );
    const out: any = await svc.doctorRecommendations('d-x', 10);
    expect(out).toEqual({ same_specialty: [], nearby: [] });
    expect(docSeen).toHaveLength(0);
  });

  it('a suspended candidate doctor is never recommended', async () => {
    const docSeen: any[] = [];
    const svc = svcWith(
      [],
      [
        { id: 'd-1', provider_type: 'doctor', specialty: 'cardiology', city: 'Jeddah', ...GOV_DOC },
        { id: 'd-2', provider_type: 'doctor', specialty: 'cardiology', city: 'Jeddah', status: 'suspended', public_eligibility: false, medical_review_status: 'pending' },
        { id: 'd-3', provider_type: 'doctor', specialty: 'cardiology', city: 'Jeddah', ...GOV_DOC },
      ],
      [], docSeen,
    );
    const out: any = await svc.doctorRecommendations('d-1', 10);
    const ids = [...out.same_specialty, ...out.nearby].map((i: any) => i.id);
    expect(ids).not.toContain('d-2');
    expect(ids).toContain('d-3');
    expect(docSeen.length).toBeGreaterThan(0);
    for (const q of docSeen) {
      expect(q).toMatchObject({ status: 'active', public_eligibility: true, medical_review_status: 'approved' });
    }
  });
});
