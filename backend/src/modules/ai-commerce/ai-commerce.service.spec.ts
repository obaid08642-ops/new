import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AiCommerceService } from './ai-commerce.service';

describe('AiCommerceService', () => {
  let service: AiCommerceService;

  const mockMedicines = [
    {
      id: 'med-1',
      slug: 'panadol-advance',
      sku: 101,
      name_ar: 'بانادول ادفانس',
      name_en: 'Panadol Advance',
      price: 18.5,
      active_ingredient: 'Paracetamol',
      requires_prescription: false,
    },
    {
      id: 'med-2',
      slug: 'lipitor-20mg',
      sku: 202,
      name_ar: 'ليبيتور 20 ملجم',
      name_en: 'Lipitor 20mg',
      price: 95.0,
      active_ingredient: 'Atorvastatin',
      requires_prescription: true,
    },
  ];

  const mockDoctors = [
    {
      id: 'doc-1',
      slug: 'dr-sara',
      name_ar: 'د. سارة',
      name_en: 'Dr. Sara',
      specialty: 'pediatrics',
      city: 'الرياض',
      accepted_insurance: ['bupa', 'tawuniya'],
    },
  ];

  const mockFacilities = [
    {
      id: 'fac-1',
      slug: 'dallah-hospital',
      name_ar: 'مستشفى دله',
      name_en: 'Dallah Hospital',
      type: 'hospital',
      city: 'الرياض',
      district: 'النخيل',
      accepted_insurance: ['bupa'],
    },
  ];

  // The filters the feed sends to provider_profiles and facilities (13-web#6).
  const feedFilters: Record<string, any> = {};

  const mockConnection = {
    collection: jest.fn().mockImplementation((name: string) => {
      if (name === 'medicines') {
        return {
          countDocuments: jest.fn().mockResolvedValue(mockMedicines.length),
          find: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue(mockMedicines),
              }),
            }),
          }),
          findOne: jest.fn().mockImplementation(({ $or }) => {
            // Unwrap scalar equality the same way Mongo matches { $eq: v }.
            const scalar = (v: any) => (v && typeof v === 'object' && '$eq' in v ? v.$eq : v);
            const val = scalar($or[0]?.id) || scalar($or[1]?.slug);
            const found = mockMedicines.find(
              (m) => m.id === val || m.slug === val || String(m.sku) === String(val),
            );
            return Promise.resolve(found || null);
          }),
        };
      }
      if (name === 'provider_profiles') {
        return {
          find: jest.fn().mockImplementation((f: any) => (feedFilters.doctor = f, {
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue(mockDoctors),
            }),
          })),
          findOne: jest.fn().mockImplementation(({ $or }) => {
            const scalar = (v: any) => (v && typeof v === 'object' && '$eq' in v ? v.$eq : v);
            const val = scalar($or[0]?.id) || scalar($or[1]?.slug);
            const found = mockDoctors.find((d) => d.id === val || d.slug === val);
            return Promise.resolve(found || null);
          }),
        };
      }
      if (name === 'facilities') {
        return {
          find: jest.fn().mockImplementation((f: any) => (feedFilters.facility = f, {
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue(mockFacilities),
            }),
          })),
        };
      }
      if (name === 'ai_checkout_sessions') {
        return {
          insertOne: jest.fn().mockResolvedValue({ insertedId: 'session-id' }),
        };
      }
      return {};
    }),
  } as any;

  beforeEach(() => {
    service = new AiCommerceService(mockConnection);
  });

  describe('getProductFeed', () => {
    it('returns formatted Schema.org Product feed with prices, SKU and deep links', async () => {
      const feed = await service.getProductFeed({ page: 1, limit: 10, locale: 'ar' });
      expect(feed.feed_type).toBe('ai_product_catalog');
      expect(feed.total_items).toBe(2);
      expect(feed.items[0]['@type']).toBe('Product');
      expect(feed.items[0].sku).toBe('101');
      expect(feed.items[0].offers.priceCurrency).toBe('SAR');
      expect(feed.items[0].url).toContain('https://nabd.plus/ar/p/panadol-advance');
      expect(feed.items[0].deepLink).toContain('nabdplus://p/panadol-advance');
    });
  });

  describe('getServiceFeed', () => {
    it('returns formatted Schema.org healthcare services with specialties and insurance', async () => {
      const feed = await service.getServiceFeed({ city: 'الرياض', locale: 'ar' });
      expect(feed.feed_type).toBe('ai_service_catalog');
      expect(feed.total_items).toBe(2);
      expect(feed.items[0]['@type']).toBe('MedicalBusiness');
      expect(feed.items[1]['@type']).toBe('Hospital');
    });

    it('lists only public, approved providers and invents no price or insurer (13-web#6)', async () => {
      const feed = await service.getServiceFeed({ city: 'الرياض', locale: 'ar' });
      expect(feedFilters.doctor).toMatchObject({ type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved' });
      expect(feedFilters.facility).toMatchObject({ is_active: true, public_eligibility: true, medical_review_status: 'approved' });
      const [doctor, facility] = feed.items;
      // The mock doctor has no clinic price: no price is shown.
      expect(doctor.priceRange).toBeUndefined();
      expect(doctor.acceptedInsurance).toEqual(['bupa', 'tawuniya']);
      expect(doctor).toMatchObject({ kind: 'doctor', slug: 'dr-sara' });
      expect(facility).toMatchObject({ kind: 'facility', slug: 'dallah-hospital', acceptedInsurance: ['bupa'] });
    });
  });

  describe('createCheckoutSession', () => {
    it('throws BadRequestException if items array is empty', async () => {
      await expect(service.createCheckoutSession({ items: [] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates an OTC checkout session with 15% VAT and checkout URLs', async () => {
      const session = await service.createCheckoutSession({
        items: [{ type: 'medicine', id: 'panadol-advance', quantity: 2 }],
        locale: 'ar',
      });

      expect(session.session_id).toMatch(/^ai_chk_/);
      expect(session.requires_prescription).toBe(false);
      expect(session.pricing.subtotal).toBe(37.0);
      expect(session.pricing.vat_amount).toBe(5.55);
      expect(session.pricing.total_sar).toBe(42.55);
      expect(session.checkout_url).toContain('https://nabd.plus/ar/checkout/session/');
      expect(session.deep_link).toContain('nabdplus://checkout/session/');
      expect(session.governance.human_approval_required).toBe(true);
    });

    it('flags prescription requirement when an Rx item is included', async () => {
      const session = await service.createCheckoutSession({
        items: [{ type: 'medicine', id: 'lipitor-20mg', quantity: 1 }],
        locale: 'ar',
      });

      expect(session.requires_prescription).toBe(true);
      expect(session.prescription_notice).toBeDefined();
    });
  });
});
