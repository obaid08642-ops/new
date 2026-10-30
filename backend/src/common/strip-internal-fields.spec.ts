import 'reflect-metadata';
import mongoose from 'mongoose';
import { of, lastValueFrom } from 'rxjs';
import { StreamableFile } from '@nestjs/common';
import { StripInternalReviewFieldsInterceptor, isInternalReviewKey, stripInternalReviewFields } from './strip-internal-fields';
import { LabsController } from '../modules/labs/labs.controller';
import { RadiologyController } from '../modules/radiology/radiology.controller';
import { RadiologyProviderController } from '../modules/radiology/controllers/radiology-provider.controller';
import { NursingController, HomeCareContractController } from '../modules/home-care/home-care.controller';
import { HomeCarePackagesController } from '../modules/home-care/home-care-packages.controller';
import { PatientNurseProfileController } from '../modules/home-care/nurse-profile.controller';
import { NursingCompatController } from '../modules/home-care/nursing-compat.controller';
import { PatientHomeCareController } from '../modules/home-care/patient-home-care.controller';
import { CatalogsController } from '../modules/catalogs/catalogs.controller';
import { CapabilitiesCatalogController } from '../modules/service-catalog/service-catalog-compat.controller';
import { SeoController } from '../modules/articles/seo.controller';
import { CatalogueInterestController } from '../modules/catalogue-interest/catalogue-interest.controller';
import { HomeController } from '../modules/home/home.controller';
import { HomeCareCompatController, NursingOpsController } from '../modules/home-care/home-care-compat.module';
import { ServiceCatalogController } from '../modules/service-catalog/service-catalog.module';
import { AiCommerceController } from '../modules/ai-commerce/ai-commerce.controller';
import { McpController } from '../modules/mcp/mcp.controller';
import { SearchController } from '../modules/search/search.controller';
import { OrderingController } from '../modules/ordering/ordering.controller';
import { ProviderOrderingController } from '../modules/provider/provider-ordering.controller';
import { ProviderServiceOffersController } from '../modules/provider/provider.controllers';

/** The keys the owner does not want a patient or provider to see on a catalogue row (decision 2026-10-30): anything that says review, reviewed, clinical or internal. */
const FORBIDDEN = /review|reviewed|clinical|internal/i;
const reviewState = { needs_clinical_review: true, reviewed_by: 'lead-market-review-2026-10-29', reviewed_at: new Date(), medical_review_status: 'approved', medical_review_note: 'x', last_reviewed_at: new Date(), internal_notes: 'x', internal_cost: 3, clinical_notes: 'x' };
const labRow = { id: 'l1', code: 'HBA1C', short_code: 'HBA1C', name_ar: 'سكر تراكمي', name_en: 'HbA1c', price: 90, category: 'blood', public_eligibility: true, active: true, ...reviewState };
const radRow = { id: 'r1', code: 'XR', name_ar: 'أشعة', name_en: 'X-ray', modality: 'xray', body_part: 'chest', contrast_required: false, public_eligibility: true, ...reviewState };
const nurseRow = { id: 'n1', code: 'IM', name_ar: 'حقنة', name_en: 'Injection', duration: 'visit', booking_options: [{ id: 'o', ...reviewState }], public_eligibility: true, ...reviewState };

function keysDeep(v: unknown, out: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, out));
  else if (v && typeof v === 'object' && !(v instanceof Date)) for (const [k, x] of Object.entries(v)) { out.push(k); keysDeep(x, out); }
  return out;
}

describe('no review state in a public, patient or provider response (owner 2026-10-30)', () => {
  it.each([['lab', labRow], ['radiology', radRow], ['nursing', nurseRow]])('a %s row, alone, in a list, in a paged envelope and in a nested offer', (_n, row) => {
    for (const shape of [row, [row, row], { data: [row], total: 1, page: { items: [{ service: row }] } }]) {
      const keys = keysDeep(stripInternalReviewFields(shape));
      expect(keys.filter((k) => FORBIDDEN.test(k))).toEqual([]);
      expect(keys).toContain('id');
    }
    const out: any = stripInternalReviewFields(row);
    expect(out).toMatchObject({ id: row.id, name_ar: row.name_ar, public_eligibility: true });   // everything a client shows is still there
  });

  it('only the review family is removed: ratings, reviews of a doctor and ordinary fields stay', () => {
    const doctor = { id: 'd', rating: 4.8, review_count: 12, reviews: [{ id: 1, text: 'great' }], price: 100, specialty: 'x', name_ar: 'د' };
    expect(stripInternalReviewFields(doctor)).toEqual(doctor);
    for (const k of ['rating', 'review_count', 'reviews', 'price', 'duration', 'sort']) expect(isInternalReviewKey(k)).toBe(false);
    for (const k of ['needs_clinical_review', 'reviewed_by', 'reviewed_at', 'medical_review_status', 'medical_review_note', 'last_reviewed_at', 'review_status', 'clinical_notes', 'internal_notes', 'internal_cost']) expect(isInternalReviewKey(k)).toBe(true);
  });

  it('does not mutate its input, keeps dates and nulls, and leaves a stream or a Buffer alone', () => {
    const when = new Date('2026-01-01');
    const row = { id: 'x', when, nothing: null, reviewed_by: 'r' };
    const out: any = stripInternalReviewFields(row);
    expect(out.when).toBe(when);
    expect(out.nothing).toBeNull();
    expect(row.reviewed_by).toBe('r');
    const file = new StreamableFile(Buffer.from('pdf'));
    expect(stripInternalReviewFields(file)).toBe(file);
    const buf = Buffer.from('x');
    expect(stripInternalReviewFields(buf)).toBe(buf);
  });

  it('reads a Mongoose document through toJSON, so a service that returns documents is covered too', () => {
    const Svc = mongoose.model('StripInternalSpecSvc', new mongoose.Schema({ id: String, name_ar: String, needs_clinical_review: Boolean, reviewed_by: String, medical_review_status: String }, { strict: false }));
    const doc = new Svc({ id: 's1', name_ar: 'خدمة', needs_clinical_review: true, reviewed_by: 'lead', medical_review_status: 'approved', price: 5 });
    const out: any = stripInternalReviewFields({ items: [doc] });
    expect(out.items[0]).toMatchObject({ id: 's1', name_ar: 'خدمة', price: 5 });
    expect(keysDeep(out).filter((k) => FORBIDDEN.test(k))).toEqual([]);
  });

  it('the interceptor strips the handler\'s result', async () => {
    const i = new StripInternalReviewFieldsInterceptor();
    const out: any = await lastValueFrom(i.intercept({} as any, { handle: () => of({ data: [labRow] }) } as any) as any);
    expect(keysDeep(out).filter((k) => FORBIDDEN.test(k))).toEqual([]);
  });
});

describe('the controllers that reach patients and providers carry the interceptor (a removed decorator fails here)', () => {
  const controllers: Array<[string, unknown]> = [
    ['labs', LabsController], ['radiology', RadiologyController], ['radiology/provider', RadiologyProviderController], ['nursing', NursingController],
    ['home-care (contract)', HomeCareContractController], ['home-care/packages', HomeCarePackagesController], ['nursing profile', PatientNurseProfileController],
    ['nursing compat', NursingCompatController], ['home-care (patient)', PatientHomeCareController], ['catalogs', CatalogsController],
    ['provider/capabilities', CapabilitiesCatalogController], ['seo', SeoController], ['catalogue-interest', CatalogueInterestController], ['home', HomeController],
    ['mcp', McpController], ['home-care (compat)', HomeCareCompatController], ['provider/nursing', NursingOpsController], ['service-catalog', ServiceCatalogController], ['public ai-catalog', AiCommerceController], ['search', SearchController], ['ordering', OrderingController], ['provider/ordering', ProviderOrderingController], ['provider/services', ProviderServiceOffersController],
  ];
  it.each(controllers)('%s', (_name, ctrl) => {
    const used: unknown[] = Reflect.getMetadata('__interceptors__', ctrl as object) ?? [];
    expect(used).toContain(StripInternalReviewFieldsInterceptor);
  });
});
