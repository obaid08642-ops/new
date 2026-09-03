import { SearchIntentService } from './search-intent.service';
import { LocationService } from '../location/location.service';
import { SAUDI_LOCATIONS_SEED } from '../location/seeds/saudi-locations.data';

describe('SearchIntentService & LocationService', () => {
  let locationService: LocationService;
  let searchIntentService: SearchIntentService;

  const mockLocationModel = {
    countDocuments: jest.fn().mockResolvedValue(SAUDI_LOCATIONS_SEED.length),
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(SAUDI_LOCATIONS_SEED),
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    }),
    findOne: jest.fn().mockImplementation(({ code }) => ({
      lean: jest.fn().mockResolvedValue(SAUDI_LOCATIONS_SEED.find(l => l.code === code) || null),
    })),
    updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
  } as any;

  const mockIntentModel = {
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
  } as any;

  const mockAnalyticsModel = {
    create: jest.fn().mockResolvedValue({}),
  } as any;

  beforeEach(() => {
    locationService = new LocationService(mockLocationModel);
    searchIntentService = new SearchIntentService(
      mockIntentModel,
      mockAnalyticsModel,
      locationService,
    );
  });

  describe('Location Resolution', () => {
    it('resolves city from Arabic text "الرياض"', async () => {
      const res = await locationService.resolveFromText('عيادات في الرياض');
      expect(res).toBeDefined();
      expect(res?.city?.code).toBe('sa-riyadh-city');
    });

    it('resolves district "العليا" and deduces parent city Riyadh', async () => {
      const res = await locationService.resolveFromText('طبيب في حي العليا');
      expect(res).toBeDefined();
      expect(res?.district?.code).toBe('sa-riyadh-olaya');
      expect(res?.city?.code).toBe('sa-riyadh-city');
    });

    it('resolves Jeddah district "حي الزهراء"', async () => {
      const res = await locationService.resolveFromText('مستشفى في الزهراء');
      expect(res).toBeDefined();
      expect(res?.district?.code).toBe('sa-jeddah-zahra');
      expect(res?.city?.code).toBe('sa-jeddah-city');
    });

    it('resolves English city "Jeddah"', async () => {
      const res = await locationService.resolveFromText('pediatrician in Jeddah');
      expect(res).toBeDefined();
      expect(res?.city?.code).toBe('sa-jeddah-city');
    });
  });

  describe('Search Intent Extraction', () => {
    it('extracts doctor + dermatology + riyadh + bupa from "دكتور جلدية شمال الرياض يقبل بوبا"', async () => {
      const intent = await searchIntentService.extractIntent('دكتور جلدية شمال الرياض يقبل بوبا', 'ar');
      expect(intent.entity_type).toBe('doctor');
      expect(intent.specialty).toBe('dermatology');
      expect(intent.insurance).toBe('bupa');
      expect(intent.canonical_path).toContain('/ar/doctors/dermatology/riyadh');
    });

    it('extracts ranking signal "top_rated" from "أفضل دكتور أطفال بالرياض"', async () => {
      const intent = await searchIntentService.extractIntent('أفضل دكتور أطفال بالرياض', 'ar');
      expect(intent.entity_type).toBe('doctor');
      expect(intent.specialty).toBe('pediatrics');
      expect(intent.ranking_signal).toBe('top_rated');
    });

    it('extracts nursing + home mode from "تمريض منزلي حي الوادي"', async () => {
      const intent = await searchIntentService.extractIntent('تمريض منزلي حي الوادي', 'ar');
      expect(intent.entity_type).toBe('nursing');
      expect(intent.service_mode).toBe('home');
      expect(intent.location?.district?.code).toBe('sa-riyadh-wadi');
      expect(intent.canonical_path).toContain('/ar/home-nursing/riyadh');
    });

    it('extracts lab + home collection from "سحب عينة دم من المنزل"', async () => {
      const intent = await searchIntentService.extractIntent('سحب عينة دم من المنزل', 'ar');
      expect(intent.entity_type).toBe('lab');
      expect(intent.service_mode).toBe('home');
      expect(intent.canonical_path).toBe('/ar/diagnostics/labs');
    });

    it('extracts pharmacy/medicine from "صيدلية توصل بانادول"', async () => {
      const intent = await searchIntentService.extractIntent('صيدلية توصل بانادول', 'ar');
      expect(intent.entity_type).toBe('medicine');
      expect(intent.service_mode).toBe('delivery');
      expect(intent.canonical_path).toBe('/ar/medicine-catalog');
    });

    it('handles multilingual query in English "skin doctor riyadh"', async () => {
      const intent = await searchIntentService.extractIntent('skin doctor riyadh', 'en');
      expect(intent.entity_type).toBe('doctor');
      expect(intent.specialty).toBe('dermatology');
      expect(intent.canonical_path).toBe('/en/doctors/dermatology/riyadh');
    });

    it('handles multilingual query in Urdu "دل کا ڈاکٹر"', async () => {
      const intent = await searchIntentService.extractIntent('دل کا ڈاکٹر', 'ur');
      expect(intent.entity_type).toBe('doctor');
      expect(intent.specialty).toBe('cardiology');
    });
  });
});
