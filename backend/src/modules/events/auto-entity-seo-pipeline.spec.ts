import { AutoEntitySeoPipelineService } from './auto-entity-seo-pipeline.service';
import { SeoService } from '../seo/seo.service';
import { McpService } from '../mcp/mcp.service';

describe('Fully Automatic Entity / Content / SEO / AEO / GEO Pipeline (20 Test Scenarios)', () => {
  let pipeline: AutoEntitySeoPipelineService;
  let seoService: SeoService;
  let mcpService: McpService;

  // In-memory mock database collections
  const mockCollections: Record<string, any[]> = {
    provider_profiles: [],
    facilities: [],
    medicines_master: [],
    homecareservices: [],
    labservices: [],
    radiologyservices: [],
    public_catalog_projections: [],
    seo_controls: [],
  };

  const mockRedis = {
    del: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  };

  const mockEvents = {
    emit: jest.fn().mockResolvedValue(true),
  };

  const createMockCollection = (name: string) => ({
    findOne: jest.fn().mockImplementation(async (filter: any) => {
      const items = mockCollections[name] || [];
      return items.find((item) => {
        if (filter.id && item.id !== filter.id) return false;
        if (filter.slug && item.slug !== filter.slug) return false;
        if (filter['$or']) {
          const matched = filter['$or'].some((cond: any) => {
            if (cond.id && item.id === cond.id) return true;
            if (cond.slug && item.slug === cond.slug) return true;
            if (cond._id && item._id === cond._id) return true;
            return false;
          });
          if (!matched) return false;
        }
        if (filter.type && item.type !== filter.type) return false;
        if (filter.is_active !== undefined && item.is_active !== filter.is_active) return false;
        return true;
      }) || null;
    }),
    find: jest.fn().mockImplementation((filter: any) => ({
      sort: () => ({
        limit: () => ({
          toArray: async () => mockCollections[name] || [],
          lean: async () => mockCollections[name] || [],
        }),
        toArray: async () => mockCollections[name] || [],
      }),
      limit: (lim: number) => ({
        toArray: async () => (mockCollections[name] || []).slice(0, lim),
        lean: async () => (mockCollections[name] || []).slice(0, lim),
      }),
      toArray: async () => mockCollections[name] || [],
      lean: async () => mockCollections[name] || [],
    })),
    updateOne: jest.fn().mockImplementation(async (filter: any, update: any, options: any) => {
      const col = mockCollections[name] || [];
      let idx = col.findIndex((item) => {
        if (filter.id && item.id === filter.id) return true;
        if (filter.entity_id && item.entity_id === filter.entity_id) return true;
        if (filter.entity_type && item.entity_type === filter.entity_type && item.entity_id === filter.entity_id) return true;
        return false;
      });

      if (idx >= 0) {
        if (update.$set) col[idx] = { ...col[idx], ...update.$set };
      } else if (options?.upsert) {
        const newItem = { ...(update.$set || {}), ...(update.$setOnInsert || {}) };
        col.push(newItem);
      }
      return { modifiedCount: 1, upsertedCount: idx >= 0 ? 0 : 1 };
    }),
  });

  const mockConnection = {
    collection: jest.fn().mockImplementation((name: string) => createMockCollection(name)),
  } as any;

  beforeEach(() => {
    // Reset collections
    Object.keys(mockCollections).forEach((k) => (mockCollections[k] = []));
    jest.clearAllMocks();

    pipeline = new AutoEntitySeoPipelineService(mockConnection, mockRedis as any, mockEvents as any);
    seoService = new SeoService(
      { find: () => ({ lean: () => ({ limit: async () => [] }) }) } as any,
      { find: () => ({ lean: () => ({ limit: async () => [] }) }) } as any,
      { find: () => ({ lean: () => ({ limit: async () => [] }) }) } as any,
      { find: () => ({ lean: () => ({ limit: async () => [] }) }) } as any,
      { find: () => ({ lean: () => ({ limit: async () => [] }) }) } as any,
      { find: () => ({ lean: () => ({ limit: async () => [] }) }) } as any,
      mockConnection,
    );
    mcpService = new McpService({ extractIntent: async () => ({}) } as any, {} as any, {} as any, mockConnection);
  });

  // 1. New Doctor
  it('Scenario 1: Create a new doctor -> verify complete automatic propagation', async () => {
    const doctor = {
      id: 'doc-001',
      name_ar: 'د. خالد العمري',
      name_en: 'Dr. Khaled Al-Omari',
      specialty: 'Cardiology',
      city: 'Riyadh',
      type: 'doctor',
      status: 'active',
      public_eligibility: true,
      medical_review_status: 'approved',
      license_verified: true,
    };
    mockCollections.provider_profiles.push(doctor);

    const res = await pipeline.processEntity({ entityType: 'doctor', entityId: 'doc-001' });

    expect(res).toBeDefined();
    expect(res.published).toBe(true);
    expect(res.indexable).toBe(true);
    expect(res.canonical_path).toContain('/doctor/');
    expect(res.schema_org['@type']).toBe('Physician');
    expect(res.schema_org.medicalSpecialty).toBe('Cardiology');
    expect(res.metadata.robots).toBe('index,follow');
    expect(mockEvents.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'entity.pipeline.projected' }));
  });

  // 2. New Pharmacy
  it('Scenario 2: Create a new pharmacy -> verify complete automatic propagation', async () => {
    const pharmacy = {
      id: 'pharm-101',
      name_ar: 'صيدلية النبض المتقدمة',
      name_en: 'Nabd Advanced Pharmacy',
      type: 'pharmacy',
      status: 'active',
      city: 'Jeddah',
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.provider_profiles.push(pharmacy);

    const res = await pipeline.processEntity({ entityType: 'pharmacy', entityId: 'pharm-101' });

    expect(res.published).toBe(true);
    expect(res.canonical_path).toContain('/pharmacy/');
    expect(res.schema_org['@type']).toBe('Pharmacy');
    expect(res.schema_org.currenciesAccepted).toBe('SAR');
  });

  // 3. New Lab
  it('Scenario 3: Create a new lab -> verify complete automatic propagation', async () => {
    const lab = {
      id: 'lab-201',
      name_ar: 'مختبرات الدقة الطبية',
      name_en: 'Precision Medical Labs',
      type: 'lab',
      is_active: true,
      city: 'Dammam',
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.facilities.push(lab);

    const res = await pipeline.processEntity({ entityType: 'lab', entityId: 'lab-201' });

    expect(res.published).toBe(true);
    expect(res.canonical_path).toContain('/facility/');
    expect(res.schema_org['@type']).toBe('MedicalBusiness');
  });

  // 4. New Radiology Provider
  it('Scenario 4: Create a new radiology provider -> verify complete automatic propagation', async () => {
    const rad = {
      id: 'rad-301',
      name_ar: 'مركز أشعة الرياض الحديث',
      name_en: 'Riyadh Modern Radiology',
      type: 'radiology',
      is_active: true,
      city: 'Riyadh',
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.facilities.push(rad);

    const res = await pipeline.processEntity({ entityType: 'radiology', entityId: 'rad-301' });

    expect(res.published).toBe(true);
    expect(res.schema_org['@type']).toBe('MedicalBusiness');
  });

  // 5. New Nursing Provider
  it('Scenario 5: Create a new nursing provider -> verify complete automatic propagation', async () => {
    const nurse = {
      id: 'nurse-401',
      name_ar: 'سارة أحمد',
      name_en: 'Sarah Ahmed',
      type: 'nursing',
      status: 'active',
      city: 'Riyadh',
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.provider_profiles.push(nurse);

    const res = await pipeline.processEntity({ entityType: 'nursing', entityId: 'nurse-401' });

    expect(res.published).toBe(true);
    expect(res.schema_org['@type']).toBe('MedicalBusiness');
  });

  // 6. New Medical Service
  it('Scenario 6: Create a new medical service -> verify complete automatic propagation', async () => {
    const svc = {
      id: 'svc-501',
      name_ar: 'خدمة تضميد الجروح المتقدمة',
      name_en: 'Advanced Wound Dressing',
      category: 'nursing',
      price: 150,
      active: true,
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.homecareservices.push(svc);

    const res = await pipeline.processEntity({ entityType: 'service', entityId: 'svc-501' });

    expect(res.published).toBe(true);
    expect(res.canonical_path).toContain('/home-care/services/');
    expect(res.schema_org['@type']).toBe('MedicalProcedure');
    expect(res.schema_org.offers.price).toBe(150);
  });

  // 7. New Lab Test
  it('Scenario 7: Create a new lab test -> verify complete automatic propagation', async () => {
    const test = {
      id: 'test-601',
      name_ar: 'تحليل صورة الدم الكاملة CBC',
      name_en: 'Complete Blood Count (CBC)',
      category: 'blood',
      sample_type: 'blood',
      price: 80,
      active: true,
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.labservices.push(test);

    const res = await pipeline.processEntity({ entityType: 'lab_test', entityId: 'test-601' });

    expect(res.published).toBe(true);
    expect(res.canonical_path).toContain('/labs/');
    expect(res.schema_org['@type']).toBe('MedicalTest');
  });

  // 8. New Radiology Service
  it('Scenario 8: Create a new radiology service -> verify complete automatic propagation', async () => {
    const radSvc = {
      id: 'radsvc-701',
      name_ar: 'أشعة رنين مغناطيسي للركبة',
      name_en: 'Knee MRI Scan',
      modality: 'mri',
      body_part: 'knee',
      price: 850,
      active: true,
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.radiologyservices.push(radSvc);

    const res = await pipeline.processEntity({ entityType: 'radiology_service', entityId: 'radsvc-701' });

    expect(res.published).toBe(true);
    expect(res.canonical_path).toContain('/radiology/services/');
    expect(res.schema_org.bodyLocation).toBe('knee');
  });

  // 9. New Medicine / Product
  it('Scenario 9: Create a new medicine/product -> verify complete automatic propagation', async () => {
    const med = {
      id: 'med-801',
      name_ar: 'بنادول إكسترا 500 ملجم',
      name_en: 'Panadol Extra 500mg',
      active_ingredient: 'Paracetamol + Caffeine',
      price: 18.5,
      active: true,
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.medicines_master.push(med);

    const res = await pipeline.processEntity({ entityType: 'medicine', entityId: 'med-801' });

    expect(res.published).toBe(true);
    expect(res.canonical_path).toContain('/p/');
    expect(res.schema_org['@type']).toBe('Drug');
    expect(res.schema_org.activeIngredient).toBe('Paracetamol + Caffeine');
  });

  // 10. Update existing entity
  it('Scenario 10: Update an existing entity -> verify all dependent indexes/cache/SEO data are updated', async () => {
    const med = {
      id: 'med-801',
      name_ar: 'بنادول إكسترا',
      name_en: 'Panadol Extra',
      price: 20.0,
      active: true,
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.medicines_master = [med];

    const res = await pipeline.processEntity({ entityType: 'medicine', entityId: 'med-801', action: 'update' });

    expect(res.schema_org.offers.price).toBe(20.0);
    expect(mockRedis.del).toHaveBeenCalled();
  });

  // 11. Deactivate entity
  it('Scenario 11: Deactivate an entity -> verify public/search/sitemap/AI visibility is handled correctly', async () => {
    const doctor = {
      id: 'doc-001',
      name_ar: 'د. خالد العمري',
      status: 'suspended',
      public_eligibility: false,
    };
    mockCollections.provider_profiles = [doctor];

    const res = await pipeline.processEntity({ entityType: 'doctor', entityId: 'doc-001', action: 'deactivate' });

    expect(res.published).toBe(false);
    expect(res.indexable).toBe(false);
    expect(res.metadata.robots).toBe('noindex,nofollow');
    expect(res.sitemap.included).toBe(false);
  });

  // 12. Reactivate entity
  it('Scenario 12: Reactivate an entity -> verify visibility is restored correctly', async () => {
    const doctor = {
      id: 'doc-001',
      name_ar: 'د. خالد العمري',
      status: 'active',
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.provider_profiles = [doctor];

    const res = await pipeline.processEntity({ entityType: 'doctor', entityId: 'doc-001', action: 'reactivate' });

    expect(res.published).toBe(true);
    expect(res.indexable).toBe(true);
    expect(res.metadata.robots).toBe('index,follow');
    expect(res.sitemap.included).toBe(true);
  });

  // 13. No duplicate canonical URLs
  it('Scenario 13: Verify no duplicate canonical URLs are created', async () => {
    const doctor = {
      id: 'doc-001',
      name_ar: 'د. خالد العمري',
      status: 'active',
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.provider_profiles = [doctor];

    const res1 = await pipeline.processEntity({ entityType: 'doctor', entityId: 'doc-001' });
    const res2 = await pipeline.processEntity({ entityType: 'doctor', entityId: 'doc-001' });

    expect(res1.canonical_url).toBe(res2.canonical_url);
    expect(res1.slug).toBe(res2.slug);
  });

  // 14. Stable entity IDs and canonical URLs
  it('Scenario 14: Verify stable entity IDs and stable canonical URLs', async () => {
    const doctor = {
      id: 'doc-999',
      name_ar: 'د. فيصل الشهري',
      status: 'active',
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.provider_profiles = [doctor];

    const firstRun = await pipeline.processEntity({ entityType: 'doctor', entityId: 'doc-999' });
    const initialSlug = firstRun.slug;

    // Mutate phone or non-name property
    doctor['phone'] = '+966500000000';
    const secondRun = await pipeline.processEntity({ entityType: 'doctor', entityId: 'doc-999', action: 'update' });

    expect(secondRun.slug).toBe(initialSlug);
    expect(secondRun.canonical_url).toBe(firstRun.canonical_url);
  });

  // 15. Slug collision handling
  it('Scenario 15: Verify slug collision handling between duplicate names', async () => {
    const doc1 = {
      id: 'doc-111',
      name_ar: 'دكتور أحمد',
      status: 'active',
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    const doc2 = {
      id: 'doc-222',
      name_ar: 'دكتور أحمد',
      status: 'active',
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.provider_profiles = [doc1, doc2];

    const run1 = await pipeline.processEntity({ entityType: 'doctor', entityId: 'doc-111' });
    const run2 = await pipeline.processEntity({ entityType: 'doctor', entityId: 'doc-222' });

    expect(run1.slug).not.toBe(run2.slug);
    expect(run1.canonical_url).not.toBe(run2.canonical_url);
  });

  // 16. Multilingual support
  it('Scenario 16: Verify multilingual Arabic/English/Urdu/Hindi/Tagalog/Bengali behavior', async () => {
    const med = {
      id: 'med-paracetamol',
      name_ar: 'باراسيتامول',
      name_en: 'Paracetamol',
      active: true,
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.medicines_master = [med];

    const res = await pipeline.processEntity({ entityType: 'medicine', entityId: 'med-paracetamol' });

    expect(res.multilingual_tokens.ar).toBeDefined();
    expect(res.multilingual_tokens.en).toBeDefined();
    expect(res.multilingual_tokens.ur).toBeDefined();
    expect(res.multilingual_tokens.hi).toBeDefined();
    expect(res.multilingual_tokens.fil).toBeDefined();
    expect(res.multilingual_tokens.bn).toBeDefined();
  });

  // 17. Location & Service relationships
  it('Scenario 17: Verify location/service relationships', async () => {
    const doctor = {
      id: 'doc-rel',
      name_ar: 'د. مها السبيعي',
      specialty: 'Pediatrics',
      city: 'Riyadh',
      district: 'Al Olaya',
      facility_id: 'fac-central',
      status: 'active',
      public_eligibility: true,
      medical_review_status: 'approved',
    };
    mockCollections.provider_profiles = [doctor];

    const res = await pipeline.processEntity({ entityType: 'doctor', entityId: 'doc-rel' });

    expect(res.relationships.city).toBe('Riyadh');
    expect(res.relationships.district).toBe('Al Olaya');
    expect(res.relationships.facility_id).toBe('fac-central');
  });

  // 18. MCP discovery reflects new entities
  it('Scenario 18: Verify MCP/entity discovery reflects newly added entities', async () => {
    const doctor = {
      id: 'doc-mcp',
      name_ar: 'د. ريان الغامدي',
      specialty: 'Dermatology',
      city: 'Jeddah',
      type: 'doctor',
      status: 'active',
      is_active: true,
      slug: 'dr-rayan-alghamdi',
    };
    mockCollections.provider_profiles = [doctor];

    const mcpRes = await mcpService.executeTool('search_doctors', { specialty: 'Dermatology', city: 'Jeddah' });

    expect(mcpRes.total).toBe(1);
    expect(mcpRes.items[0].name).toBe('د. ريان الغامدي');
    expect(mcpRes.items[0].canonical_url).toContain('/doctor/dr-rayan-alghamdi');
  });

  // 19. Search results reflect newly added entities
  it('Scenario 19: Verify search results reflect newly added entities', async () => {
    const med = {
      id: 'med-brufen',
      name_ar: 'بروفين 400 ملجم',
      name_en: 'Brufen 400mg',
      active_ingredient: 'Ibuprofen',
      price: 15,
      active: true,
      is_deleted: false,
      slug: 'brufen-400mg',
    };
    mockCollections.medicines_master = [med];

    const searchRes = await mcpService.executeTool('search_medicines', { query: 'Brufen' });

    expect(searchRes.total).toBe(1);
    expect(searchRes.items[0].name).toContain('بروفين');
  });

  // 20. Dynamic sitemap verification
  it('Scenario 20: Verify sitemap reflects newly added/removed public entities', async () => {
    mockCollections.public_catalog_projections = [
      {
        entity_type: 'pharmacy',
        slug: 'nabd-care-pharmacy-1',
        canonical_path: '/pharmacy/nabd-care-pharmacy-1',
        canonical_url: 'https://nabd.plus/ar/pharmacy/nabd-care-pharmacy-1',
        indexable: true,
        sitemap: { included: true },
        updated_at: new Date('2026-09-04'),
      },
    ];

    const sitemap = await seoService.sitemap();

    expect(sitemap).toContain('https://nabd.plus/ar/pharmacy/nabd-care-pharmacy-1');
  });
});
