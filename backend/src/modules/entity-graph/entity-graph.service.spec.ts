import { EntityGraphService } from './entity-graph.service';
import { SEED_CONDITIONS } from './seeds/conditions.data';

describe('EntityGraphService', () => {
  let service: EntityGraphService;

  const mockMedicine = {
    _id: 'med1',
    id: 'med-101',
    slug: 'panadol-extra',
    sku: 697836,
    name_ar: 'بانادول اكسترا',
    name_en: 'Panadol Extra',
    active_ingredient: 'Paracetamol',
    price: 15.5,
    form: 'Tablet',
    strength: '500mg',
    requires_prescription: false,
  };

  const mockDoctor = {
    _id: 'doc1',
    id: 'doc-202',
    slug: 'dr-mohamed-hussein',
    name_ar: 'د. محمد محمود حسين',
    name_en: 'Dr. Mohamed Mahmoud Hussein',
    specialty: 'dermatology',
    city: 'الرياض',
    facility_id: 'dallah-hospital',
    rating: 4.9,
    experience_years: 14,
    accepted_insurance: ['bupa', 'tawuniya'],
  };

  const mockFacility = {
    _id: 'fac1',
    id: 'dallah-hospital',
    slug: 'dallah-hospital',
    name_ar: 'مستشفى دله',
    name_en: 'Dallah Hospital',
    type: 'hospital',
    city: 'الرياض',
    district: 'النخيل',
    phone: '+966112540000',
    departments: ['dermatology', 'pediatrics', 'cardiology'],
    accepted_insurance: ['bupa', 'tawuniya', 'medgulf'],
  };

  const mockConditionModel = {
    countDocuments: jest.fn().mockResolvedValue(SEED_CONDITIONS.length),
    findOne: jest.fn().mockImplementation(({ code }) => ({
      lean: jest.fn().mockResolvedValue(SEED_CONDITIONS.find(c => c.code === code) || null),
    })),
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([SEED_CONDITIONS[0]]),
      }),
    }),
    updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
  } as any;

  const mockRelationModel = {
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
  } as any;

  const mockConnection = {
    collection: jest.fn().mockImplementation((name: string) => {
      if (name === 'medicines_master') {
        return {
          findOne: jest.fn().mockResolvedValue(mockMedicine),
          find: jest.fn().mockReturnValue({
            project: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([
                  {
                    name_ar: 'فيفادول 500',
                    name_en: 'Fevadol 500',
                    slug: 'fevadol-500',
                    price: 12.0,
                    form: 'Tablet',
                    strength: '500mg',
                    sku: 102030,
                  },
                ]),
              }),
            }),
          }),
        };
      }
      if (name === 'provider_profiles') {
        return {
          findOne: jest.fn().mockResolvedValue(mockDoctor),
          find: jest.fn().mockReturnValue({
            project: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([mockDoctor]),
              }),
            }),
          }),
        };
      }
      if (name === 'facilities') {
        return {
          findOne: jest.fn().mockResolvedValue(mockFacility),
          find: jest.fn().mockReturnValue({
            project: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([mockFacility]),
              }),
            }),
          }),
        };
      }
      return {
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockReturnValue({
          project: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };
    }),
  } as any;

  const mockLocationService = {} as any;

  beforeEach(() => {
    service = new EntityGraphService(
      mockConditionModel,
      mockRelationModel,
      mockConnection,
      mockLocationService,
    );
  });

  describe('Medicine traversal', () => {
    it('resolves active ingredient, alternatives, and conditions for a medicine', async () => {
      const res = await service.getRelated('medicine', 'panadol-extra');
      expect(res).toBeDefined();
      expect(res.entity_type).toBe('medicine');
      expect(res.entity.name_ar).toBe('بانادول اكسترا');
      expect(res.relationships.active_ingredient).toBe('Paracetamol');
      expect(res.relationships.alternatives.length).toBeGreaterThan(0);
      expect(res.relationships.alternatives[0].name_ar).toBe('فيفادول 500');
    });
  });

  describe('Doctor traversal', () => {
    it('resolves practicing facility, accepted insurances, and treated conditions for a doctor', async () => {
      const res = await service.getRelated('doctor', 'doc-202');
      expect(res).toBeDefined();
      expect(res.entity_type).toBe('doctor');
      expect(res.entity.specialty).toBe('dermatology');
      expect(res.relationships.facility).toBeDefined();
      expect(res.relationships.facility.name_ar).toBe('مستشفى دله');
      expect(res.relationships.accepted_insurance).toContain('bupa');
    });
  });

  describe('Condition traversal', () => {
    it('resolves relevant specialties, doctors, and medicines for headache', async () => {
      const res = await service.getRelated('condition', 'headache');
      expect(res).toBeDefined();
      expect(res.entity_type).toBe('condition');
      expect(res.relationships.specialties).toContain('internal_medicine');
      expect(res.relationships.doctors.length).toBeGreaterThan(0);
      expect(res.relationships.relevant_medicines.length).toBeGreaterThan(0);
    });
  });

  describe('Facility traversal', () => {
    it('resolves practicing doctors and supported departments for a facility', async () => {
      const res = await service.getRelated('facility', 'dallah-hospital');
      expect(res).toBeDefined();
      expect(res.entity_type).toBe('facility');
      expect(res.relationships.doctors.length).toBeGreaterThan(0);
      expect(res.relationships.departments).toContain('dermatology');
    });
  });

  describe('Multidimensional exploration', () => {
    it('explores doctors and facilities for Dermatology in Riyadh with Bupa', async () => {
      const res = await service.explore({
        specialty: 'dermatology',
        city: 'الرياض',
        insurance: 'bupa',
      });
      expect(res).toBeDefined();
      expect(res.total_doctors).toBe(1);
      expect(res.doctors[0].specialty).toBe('dermatology');
      expect(res.total_facilities).toBe(1);
    });
  });
});
