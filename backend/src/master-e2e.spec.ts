import { SearchIntentService } from './modules/search-intent/search-intent.service';
import { EntityGraphService } from './modules/entity-graph/entity-graph.service';
import { LocationService } from './modules/location/location.service';
import { McpService } from './modules/mcp/mcp.service';
import { AiCommerceService } from './modules/ai-commerce/ai-commerce.service';
import { IndexNowService } from './modules/seo/indexnow.service';
import { AdminGovernanceControlsController } from './modules/admin-enterprise/admin-governance-controls.controller';

describe('MASTER ADDENDUM — Full End-to-End Architectural Verification', () => {
  // Mock In-Memory Databases & State
  const mockLocations = [
    { code: 'sa', name_ar: 'المملكة العربية السعودية', name_en: 'Saudi Arabia', type: 'country', is_active: true, aliases: [] },
    { code: 'sa-riyadh-region', name_ar: 'منطقة الرياض', name_en: 'Riyadh Region', type: 'region', parent_code: 'sa', is_active: true, aliases: [] },
    { code: 'sa-riyadh-city', name_ar: 'الرياض', name_en: 'Riyadh', type: 'city', parent_code: 'sa-riyadh-region', is_active: true, aliases: ['riyadh', 'الرياض'] },
    { code: 'sa-olaya', name_ar: 'العليا', name_en: 'Al Olaya', type: 'district', parent_code: 'sa-riyadh-city', is_active: true, aliases: ['olaya', 'العليا'] },
  ];

  const mockMedicines = [
    {
      id: 'med-101',
      slug: 'panadol-advance-500mg',
      sku: 100001,
      name_ar: 'بنادول ادفانس 500 مجم',
      name_en: 'Panadol Advance 500mg',
      price: 18.5,
      active_ingredient: 'Paracetamol',
      category: 'Analgesics',
      requires_prescription: false,
    },
    {
      id: 'med-102',
      slug: 'lipitor-20mg-tablets',
      sku: 100002,
      name_ar: 'ليبيتور 20 مجم',
      name_en: 'Lipitor 20mg',
      price: 95.0,
      active_ingredient: 'Atorvastatin',
      category: 'Cardiovascular',
      requires_prescription: true,
    },
  ];

  const mockDoctors = [
    {
      id: 'doc-201',
      slug: 'dr-abdullah-al-otaibi',
      name_ar: 'د. عبدالله العتيبي',
      name_en: 'Dr. Abdullah Al-Otaibi',
      specialty: 'pediatrics',
      city: 'الرياض',
      accepted_insurance: ['bupa', 'tawuniya'],
      rating: 4.9,
      provider_type: 'doctor',
      is_active: true,
    },
  ];

  const mockFacilities = [
    {
      id: 'fac-301',
      slug: 'dallah-hospital',
      name_ar: 'مستشفى دله',
      name_en: 'Dallah Hospital',
      type: 'hospital',
      city: 'الرياض',
      district: 'النخيل',
      accepted_insurance: ['bupa', 'tawuniya'],
      is_active: true,
    },
  ];

  const mockConditions = [
    {
      id: 'cond-401',
      code: 'headache',
      slug: 'headache',
      name_ar: 'صداع',
      name_en: 'Headache',
      specialties: ['neurology', 'general_practice'],
      relevant_ingredients: ['Paracetamol'],
      relevant_services: ['consultation'],
      is_active: true,
      is_deleted: false,
    },
  ];

  const mockSessions: any[] = [];
  const mockAuditLogs: any[] = [];
  const mockIndexNowSubs: any[] = [];

  const createQueryChain = (data: any[]) => {
    const chain: any = {};
    chain.project = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.skip = jest.fn().mockReturnValue(chain);
    chain.sort = jest.fn().mockReturnValue(chain);
    chain.toArray = jest.fn().mockResolvedValue(data);
    return chain;
  };

  const mockConnection = {
    collection: jest.fn().mockImplementation((name: string) => {
      switch (name) {
        case 'locations':
          return {
            find: jest.fn().mockImplementation(() => createQueryChain(mockLocations)),
            countDocuments: jest.fn().mockResolvedValue(mockLocations.length),
          };
        case 'medicines_master':
          return {
            find: jest.fn().mockImplementation(() => createQueryChain(mockMedicines)),
            findOne: jest.fn().mockImplementation((filter) => {
              if (filter?.slug) return Promise.resolve(mockMedicines.find((m) => m.slug === filter.slug) || null);
              if (filter?.$or) {
                const terms = filter.$or.map((o: any) => o.slug || o.id || o.sku);
                const found = mockMedicines.find((m) => terms.includes(m.slug) || terms.includes(m.id) || terms.includes(m.sku));
                return Promise.resolve(found || null);
              }
              return Promise.resolve(null);
            }),
            countDocuments: jest.fn().mockResolvedValue(mockMedicines.length),
          };
        case 'provider_profiles':
          return {
            find: jest.fn().mockImplementation(() => createQueryChain(mockDoctors)),
            findOne: jest.fn().mockResolvedValue(mockDoctors[0]),
            countDocuments: jest.fn().mockResolvedValue(mockDoctors.length),
          };
        case 'facilities':
          return {
            find: jest.fn().mockImplementation(() => createQueryChain(mockFacilities)),
            findOne: jest.fn().mockResolvedValue(mockFacilities[0]),
            countDocuments: jest.fn().mockResolvedValue(mockFacilities.length),
          };
        case 'conditions':
          return {
            find: jest.fn().mockImplementation(() => createQueryChain(mockConditions)),
            findOne: jest.fn().mockResolvedValue(mockConditions[0]),
            countDocuments: jest.fn().mockResolvedValue(mockConditions.length),
          };
        case 'ai_checkout_sessions':
          return {
            insertOne: jest.fn().mockImplementation(async (doc) => {
              mockSessions.push(doc);
              return { insertedId: 'session-id' };
            }),
            find: jest.fn().mockImplementation(() => createQueryChain(mockSessions)),
          };
        case 'query_analytics':
          return {
            insertOne: jest.fn().mockResolvedValue({}),
            countDocuments: jest.fn().mockResolvedValue(10),
            aggregate: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([{ _id: 'بنادول', count: 5, avgResults: 2 }]),
            }),
          };
        case 'medicine_price_history':
          return {
            find: jest.fn().mockImplementation(() => createQueryChain(mockAuditLogs)),
          };
        case 'indexnow_submissions':
          return {
            insertOne: jest.fn().mockImplementation(async (doc) => {
              mockIndexNowSubs.push(doc);
              return { insertedId: 'sub-id' };
            }),
            find: jest.fn().mockImplementation(() => createQueryChain(mockIndexNowSubs)),
          };
        default:
          return {
            find: jest.fn().mockImplementation(() => createQueryChain([])),
            countDocuments: jest.fn().mockResolvedValue(0),
          };
      }
    }),
  } as any;

  // Services
  let locationService: LocationService;
  let searchIntentService: SearchIntentService;
  let entityGraphService: EntityGraphService;
  let mcpService: McpService;
  let aiCommerceService: AiCommerceService;
  let indexNowService: IndexNowService;
  let adminController: AdminGovernanceControlsController;

  beforeAll(() => {
    const mockLocationModel: any = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockLocations),
        exec: jest.fn().mockResolvedValue(mockLocations),
      }),
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockLocations[0]),
        exec: jest.fn().mockResolvedValue(mockLocations[0]),
      }),
    };

    const mockConditionModel: any = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockConditions),
        exec: jest.fn().mockResolvedValue(mockConditions),
      }),
      findOne: jest.fn().mockImplementation((filter: any) => ({
        lean: jest.fn().mockResolvedValue(mockConditions.find((c) => c.code === filter?.code) || mockConditions[0]),
        exec: jest.fn().mockResolvedValue(mockConditions.find((c) => c.code === filter?.code) || mockConditions[0]),
      })),
      countDocuments: jest.fn().mockResolvedValue(mockConditions.length),
      insertMany: jest.fn().mockResolvedValue([]),
    };

    const mockRelationModel: any = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
        exec: jest.fn().mockResolvedValue([]),
      }),
      create: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      bulkWrite: jest.fn().mockResolvedValue({}),
    };

    const mockAnalyticsModel: any = {
      create: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };

    const mockIntentModel: any = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    };

    locationService = new LocationService(mockLocationModel);
    searchIntentService = new SearchIntentService(mockIntentModel, mockAnalyticsModel, locationService);
    entityGraphService = new EntityGraphService(mockConditionModel, mockRelationModel, mockConnection, locationService);
    mcpService = new McpService(
      searchIntentService,
      entityGraphService,
      locationService,
      mockConnection,
    );
    aiCommerceService = new AiCommerceService(mockConnection);
    indexNowService = new IndexNowService(mockConnection);
    adminController = new AdminGovernanceControlsController(mockConnection, { write: jest.fn() } as any);
  });

  // =========================================================================
  // 1. Search Intent & Multilingual Extraction (Batch 1)
  // =========================================================================
  describe('Batch 1: Search Intent & Multilingual Location Intelligence', () => {
    it('accurately resolves Arabic search intent with location and insurance', async () => {
      const res = await searchIntentService.extractIntent('طبيب أطفال في العليا يقبل بوبا', 'ar');
      expect(res.specialty).toBe('pediatrics');
      expect(res.insurance).toBe('bupa');
      expect(res.entity_type).toBe('doctor');
    });

    it('accurately resolves English search query with doctor intent', async () => {
      const res = await searchIntentService.extractIntent('pediatric doctor in Riyadh', 'en');
      expect(res.specialty).toBe('pediatrics');
      expect(res.entity_type).toBe('doctor');
    });

    it('accurately resolves South Asian query (Urdu / Hindi transliteration)', async () => {
      const res = await searchIntentService.extractIntent('bachon ka doctor', 'ur');
      expect(res.specialty).toBe('pediatrics');
      expect(res.entity_type).toBe('doctor');
    });
  });

  // =========================================================================
  // 2. Entity Graph & Relationship Traversal (Batch 2)
  // =========================================================================
  describe('Batch 2: Centralized Entity Graph Navigation', () => {
    it('traverses condition graph to find matching specialties, medicines, and doctors', async () => {
      const related = await entityGraphService.getRelated('condition', 'headache');
      expect(related.entity_type).toBe('condition');
      expect(related.entity_id).toBe('headache');
      expect(related.relationships.specialties).toBeDefined();
    });

    it('explores graph with multiple criteria without fabricating data', async () => {
      const results = await entityGraphService.explore({ specialty: 'pediatrics', city: 'الرياض' });
      expect(results.doctors).toHaveLength(1);
      expect(results.doctors[0].id).toBe('doc-201');
    });
  });

  // =========================================================================
  // 3. MCP Server & AI Tools Layer (Batch 5)
  // =========================================================================
  describe('Batch 5: MCP Server & Tool Governance', () => {
    it('responds to JSON-RPC 2.0 initialize protocol', async () => {
      const res = await mcpService.handleRpcRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2024-11-05' },
      });
      expect(res.result.serverInfo.name).toBe('nabdah-mcp-server');
      expect(res.result.protocolVersion).toBe('2024-11-05');
    });

    it('lists all registered discovery and transaction tools in tools/list', async () => {
      const res = await mcpService.handleRpcRequest({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      });
      expect(res.result.tools.length).toBeGreaterThanOrEqual(5);
      const names = res.result.tools.map((t: any) => t.name);
      expect(names).toContain('search_entities');
      expect(names).toContain('prepare_transaction');
      expect(names).toContain('check_prescription_required');
    });

    it('verifies SFDA prescription requirements via check_prescription_required', async () => {
      const rxCheck: any = await mcpService.executeTool('check_prescription_required', {
        medicine_slug_or_id: 'lipitor-20mg-tablets',
      });
      expect(rxCheck.requires_prescription).toBe(true);
      expect(rxCheck.regulation_notice).toContain('SFDA: Requires verified medical prescription');

      const otcCheck: any = await mcpService.executeTool('check_prescription_required', {
        medicine_slug_or_id: 'panadol-advance-500mg',
      });
      expect(otcCheck.requires_prescription).toBe(false);
    });

    it('blocks automatic transaction for Rx medicines without prescription', async () => {
      const tx: any = await mcpService.executeTool('prepare_transaction', {
        transaction_type: 'medicine_order',
        entity_id: 'lipitor-20mg-tablets',
      });
      expect(tx.status).toBe('BLOCKED_RX_REQUIRED');
      expect(tx.requires_prescription).toBe(true);
    });
  });

  // =========================================================================
  // 4. AI Commerce Readiness & Structured Feeds (Batch 6)
  // =========================================================================
  describe('Batch 6: AI Commerce Readiness & Feeds', () => {
    it('serves Schema.org compliant Product feed with SAR currency and active ingredients', async () => {
      const feed = await aiCommerceService.getProductFeed({ page: 1, limit: 10, locale: 'ar' });
      expect(feed.feed_type).toBe('ai_product_catalog');
      expect(feed.items[0]['@type']).toBe('Product');
      expect(feed.items[0].offers.priceCurrency).toBe('SAR');
      expect(feed.items[0].url).toContain('https://nabd.plus/ar/p/');
      expect(feed.items[0].deepLink).toContain('nabdplus://p/');
    });

    it('creates a secure checkout session with 15% VAT and human handoff', async () => {
      const session = await aiCommerceService.createCheckoutSession({
        items: [{ type: 'medicine', id: 'panadol-advance-500mg', quantity: 2 }],
        locale: 'ar',
      });
      expect(session.session_id).toMatch(/^ai_chk_/);
      expect(session.pricing.subtotal).toBe(37.0);
      expect(session.pricing.vat_15_percent).toBe(5.55);
      expect(session.pricing.total_sar).toBe(42.55);
      expect(session.checkout_url).toContain('https://nabd.plus/ar/checkout/session/');
      expect(session.governance.human_approval_required).toBe(true);
    });
  });

  // =========================================================================
  // 5. Admin Governance, Query Analytics & Audit (Batch 7)
  // =========================================================================
  describe('Batch 7: Admin Control & Compliance Audit', () => {
    it('retrieves search intent analytics including zero-result metrics', async () => {
      const stats = await adminController.searchIntentAnalytics();
      expect(stats.total_queries).toBe(10);
      expect(stats.top_queries[0].query).toBe('بنادول');
    });

    it('retrieves MCP AI agent audit logs', async () => {
      const logs = await adminController.mcpAuditLogs();
      expect(logs.total_sessions).toBeGreaterThan(0);
      expect(logs.sessions[0].session_id).toMatch(/^ai_chk_/);
    });

    it('retrieves entity graph health stats across all domains', async () => {
      const stats = await adminController.entityGraphStats();
      expect(stats.graph_status).toBe('healthy');
      expect(stats.nodes.total_nodes).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 6. Dynamic Sitemaps & IndexNow Protocol (Batch 8)
  // =========================================================================
  describe('Batch 8: Dynamic Sitemaps & IndexNow Integration', () => {
    it('provides domain verification key for IndexNow crawlers', () => {
      expect(indexNowService.getKey()).toBe('nabdplusindexnowkey');
    });

    it('submits URLs to IndexNow and logs submission audit', async () => {
      global.fetch = jest.fn().mockResolvedValue({ status: 200 });
      const res = await indexNowService.submitUrls([
        'https://nabd.plus/ar/p/panadol-advance-500mg',
        'https://nabd.plus/ar/doctor/dr-abdullah-al-otaibi',
      ]);
      expect(res.success).toBe(true);
      expect(res.urls_submitted).toBe(2);
      expect(mockIndexNowSubs.length).toBeGreaterThan(0);
    });
  });
});
