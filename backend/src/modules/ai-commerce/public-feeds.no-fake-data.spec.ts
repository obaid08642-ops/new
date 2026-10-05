// Review of c6f098a / 44f7ef0: public feeds read by AI agents and the website
// invented values and listed providers that are not public.
//  - ai-commerce service feed: every provider_profiles row (pharmacies, labs,
//    pending providers) became a "Doctor Consultation" with priceRange '150 SAR'
//    and insurers ['bupa','tawuniya','medgulf'] when the doctor had none;
//  - entity-graph doctor: rating fell back to 4.8 and pending profiles resolved.
import { AiCommerceService } from './ai-commerce.service';
import { EntityGraphService } from '../entity-graph/entity-graph.service';

type Row = Record<string, unknown>;
const match = (r: Row, f: Record<string, unknown>): boolean => Object.entries(f).every(([k, v]) => {
  if (k === '$or') return (v as Record<string, unknown>[]).some((c) => match(r, c));
  if (v && typeof v === 'object' && '$ne' in (v as Row)) return r[k] !== (v as Row).$ne;
  if (v && typeof v === 'object' && '$regex' in (v as Row)) return new RegExp(String((v as Row).$regex), 'i').test(String(r[k] ?? ''));
  return r[k] === v;
});
const collections = (data: Record<string, Row[]>) => ({
  collection: (name: string) => ({
    find: (f: Record<string, unknown>) => ({ limit: () => ({ toArray: async () => (data[name] || []).filter((r) => match(r, f)) }) }),
    findOne: async (f: Record<string, unknown>) => (data[name] || []).find((r) => match(r, f)) ?? null,
  }),
});

const providers: Row[] = [
  { id: 'doc-pub', slug: 'dr-pub', type: 'doctor', status: 'active', public_eligibility: true, name_ar: 'د. عامة', specialty: 'cardiology', city: 'الرياض', price_clinic: 220 },
  { id: 'doc-nofee', slug: 'dr-nofee', type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', name_ar: 'د. بدون رسوم', specialty: 'cardiology', city: 'الرياض' },
  { id: 'doc-pending', slug: 'dr-pending', type: 'doctor', status: 'pending', public_eligibility: false, name_ar: 'د. قيد المراجعة', city: 'الرياض' },
  { id: 'ph-1', slug: 'ph-1', type: 'pharmacy', status: 'active', public_eligibility: true, name_ar: 'صيدلية', city: 'الرياض' },
];

describe('public AI service feed carries only real, public data', () => {
  it('lists public doctors only, with their real fee and no invented insurers', async () => {
    const svc = new AiCommerceService(collections({ provider_profiles: providers, facilities: [] }) as never);
    const feed = await svc.getServiceFeed({ city: 'الرياض', locale: 'ar' });
    const docs = feed.items.filter((i: Row) => i['@type'] === 'MedicalBusiness');
    expect(docs.map((d: Row) => d.id).sort()).toEqual(['doc-nofee', 'doc-pub']);
    const pub = docs.find((d: Row) => d.id === 'doc-pub');
    const nofee = docs.find((d: Row) => d.id === 'doc-nofee');
    expect(pub.priceRange).toBe('220 SAR');
    expect(nofee.priceRange).toBeUndefined();
    expect(nofee.acceptedInsurance).toEqual([]);
  });
});

describe('entity-graph doctor (public read)', () => {
  const graph = (rows: Row[]) => {
    const svc = new EntityGraphService(
      { find: () => ({ select: () => ({ lean: async () => [] }) }) } as never, {} as never,
      collections({ provider_profiles: rows }) as never, {} as never,
    );
    return svc;
  };
  it('has no invented rating', async () => {
    const out: any = await graph(providers).getRelated('doctor', 'dr-nofee');
    expect(out.entity.rating ?? null).toBeNull();
  });
  it('does not resolve a doctor that is not public', async () => {
    await expect(graph(providers).getRelated('doctor', 'dr-pending')).rejects.toThrow('not found');
  });
});
