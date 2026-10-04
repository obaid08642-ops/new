import {
  SearchIntentService,
  normalizeQuery,
  applySearchAliases,
  transliterateQuery,
  resolveSearchCategory,
} from './search-intent.service';
import { LocationService } from '../location/location.service';
import { SAUDI_LOCATIONS_SEED } from '../location/seeds/saudi-locations.data';

/**
 * 13.R7 — search pipeline: normalization, aliases, transliteration,
 * intent/entity extraction, category scope. Fully mocked (no DB).
 */
describe('13.R7 search normalization + aliases + intent', () => {
  let svc: SearchIntentService;

  beforeEach(() => {
    const mockLocationModel = {
      countDocuments: jest.fn().mockResolvedValue(SAUDI_LOCATIONS_SEED.length),
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(SAUDI_LOCATIONS_SEED),
        sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }),
      findOne: jest.fn().mockImplementation(({ code }) => ({
        lean: jest.fn().mockResolvedValue(SAUDI_LOCATIONS_SEED.find((l) => l.code === code) || null),
      })),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    } as any;
    const mockIntentModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    } as any;
    const mockAnalyticsModel = { create: jest.fn().mockResolvedValue({}) } as any;
    svc = new SearchIntentService(
      mockIntentModel,
      mockAnalyticsModel,
      new LocationService(mockLocationModel),
    );
  });

  describe('normalization (diacritics / alef-hamza folding / case / trim)', () => {
    it('folds diacritics + alef variants to one form', () => {
      expect(normalizeQuery('أَفْضَلُ دكتورِ أطفال')).toBe(normalizeQuery('افضل دكتور اطفال'));
    });
    it('folds hamza forms (ؤ→و, ئ→ي, ء dropped)', () => {
      expect(normalizeQuery('شاطئ')).toBe('شاطي');
      expect(normalizeQuery('مؤتمر')).toBe('موتمر');
    });
    it('lowercases + trims + collapses spaces', () => {
      expect(normalizeQuery('  Panadol   EXTRA  ')).toBe('panadol extra');
    });
  });

  describe('alias table', () => {
    it('maps latin misspelling banadol → panadol', () => {
      expect(applySearchAliases(normalizeQuery('banadol'))).toBe('panadol');
    });
    it('maps arabic variant بنادول → بانادول', () => {
      expect(applySearchAliases(normalizeQuery('بنادول'))).toBe('بانادول');
    });
    it('maps advil/ibuprofen → brufen', () => {
      expect(applySearchAliases(normalizeQuery('advil'))).toBe('brufen');
      expect(applySearchAliases(normalizeQuery('IBUPROFEN'))).toBe('brufen');
    });
  });

  describe('transliteration (latin↔arabic drug terms)', () => {
    it('expands بانادول with its latin form', () => {
      expect(transliterateQuery('بانادول')).toContain('panadol');
    });
    it('expands panadol with its arabic form', () => {
      expect(transliterateQuery('panadol')).toContain('بانادول');
    });
  });

  describe('intent/entity extraction + category scope passthrough', () => {
    it('resolves alias "adol" to medicine intent (no DB)', async () => {
      const intent = await svc.extractIntent('adol', 'en');
      expect(intent.entity_type).toBe('medicine');
      expect(intent.normalized_query).toBe('panadol');
      expect(intent.query_variants).toContain('بانادول');
    });
    it('scopes an undetected query via category hint (lab)', async () => {
      const intent = await svc.extractIntent('مختبر في الرياض', 'ar', 'web', { category: 'lab' });
      expect(intent.entity_type).toBe('lab');
      expect(intent.category_scope).toMatchObject({ category: 'lab' });
      expect(intent.canonical_path).toBe('/ar/diagnostics/labs');
    });
    it('confident detection wins over a conflicting category hint', async () => {
      const intent = await svc.extractIntent('skin doctor riyadh', 'en', 'web', {
        category: 'lab',
        scope: 'home',
      });
      expect(intent.entity_type).toBe('doctor');
      expect(intent.specialty).toBe('dermatology');
      expect(intent.category_scope).toMatchObject({ category: 'lab', scope: 'home' });
    });
    it('resolves arabic category labels', () => {
      expect(resolveSearchCategory('صيدلية')).toBe('pharmacy');
      expect(resolveSearchCategory('unknown-xyz')).toBeUndefined();
    });
  });
});
