import { McpService } from './mcp.service';

describe('McpService', () => {
  let service: McpService;

  const mockSearchIntentService = {
    extractIntent: jest.fn().mockResolvedValue({
      entity_type: 'doctor',
      specialty: 'dermatology',
      service_mode: 'clinic',
      canonical_path: '/ar/doctors/dermatology/riyadh',
      location: { city: { name_ar: 'الرياض' } },
      insurance: 'bupa',
    }),
  } as any;

  const mockEntityGraphService = {
    explore: jest.fn().mockResolvedValue({
      doctors: [
        {
          id: 'doc-1',
          slug: 'dr-mohamed',
          name_ar: 'د. محمد',
          name_en: 'Dr. Mohamed',
          specialty: 'dermatology',
          city: 'الرياض',
          rating: 4.9,
        },
      ],
      facilities: [
        {
          id: 'fac-1',
          slug: 'dallah-hospital',
          name_ar: 'مستشفى دله',
          name_en: 'Dallah Hospital',
          type: 'hospital',
          city: 'الرياض',
          district: 'النخيل',
        },
      ],
    }),
    getRelated: jest.fn().mockImplementation((type, id) => {
      if (type === 'medicine') {
        return Promise.resolve({
          entity_type: 'medicine',
          entity: {
            id: 'panadol-1',
            slug: 'panadol-extra',
            name_ar: 'بانادول اكسترا',
            price: 15.5,
          },
          relationships: {
            active_ingredient: 'Paracetamol',
            alternatives: [
              { slug: 'fevadol-500', name_ar: 'فيفادول', price: 12.0 },
            ],
          },
        });
      }
      return Promise.resolve({ entity_type: type, entity_id: id, relationships: {} });
    }),
  } as any;

  const mockLocationService = {} as any;

  const mockConnection = {
    collection: jest.fn().mockImplementation((colName) => {
      if (colName === 'medicines_master') {
        return {
          findOne: jest.fn().mockImplementation(({ $or }) => {
            const term = $or[0]?.slug || $or[1]?.id;
            if (term === 'antibiotic-amoxil') {
              return Promise.resolve({
                slug: 'antibiotic-amoxil',
                name_ar: 'أموكسيل مضاد حيوي',
                price: 45.0,
                requires_prescription: true,
              });
            }
            return Promise.resolve({
              slug: 'panadol-extra',
              sku: 12345,
              name_ar: 'بانادول اكسترا',
              price: 15.5,
              requires_prescription: false,
            });
          }),
        };
      }
      if (colName === 'provider_profiles') {
        return {
          findOne: jest.fn().mockResolvedValue({
            id: 'doc-1',
            name_ar: 'د. محمد',
            specialty: 'dermatology',
          }),
        };
      }
      return { findOne: jest.fn().mockResolvedValue(null) };
    }),
  } as any;

  beforeEach(() => {
    service = new McpService(
      mockSearchIntentService,
      mockEntityGraphService,
      mockLocationService,
      mockConnection,
    );
  });

  describe('Protocol handling', () => {
    it('handles initialize request according to MCP 2024-11-05 spec', async () => {
      const res = await service.handleRpcRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
      });
      expect(res.jsonrpc).toBe('2.0');
      expect(res.id).toBe(1);
      expect(res.result.protocolVersion).toBe('2024-11-05');
      expect(res.result.serverInfo.name).toBe('nabdah-mcp-server');
    });

    it('lists registered MCP tools including discovery and compliance tools', async () => {
      const res = await service.handleRpcRequest({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      });
      expect(res.result.tools.length).toBeGreaterThanOrEqual(5);
      const toolNames = res.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('search_entities');
      expect(toolNames).toContain('get_entity_detail');
      expect(toolNames).toContain('find_alternatives');
      expect(toolNames).toContain('check_availability');
      expect(toolNames).toContain('prepare_transaction');
      expect(toolNames).toContain('check_prescription_required');
    });
  });

  describe('Tool execution', () => {
    it('executes search_entities and returns entities with canonical URLs and deep links', async () => {
      const res: any = await service.executeTool('search_entities', {
        query: 'دكتور جلدية في الرياض',
        locale: 'ar',
      });
      expect(res.total_results).toBeGreaterThan(0);
      expect(res.results[0].canonical_url).toContain('https://nabd.plus/ar/doctor/');
      expect(res.results[0].deep_link).toContain('nabdplus://doctor/');
    });

    it('finds alternatives for medicine with active ingredient and price', async () => {
      const res: any = await service.executeTool('find_alternatives', {
        medicine_slug_or_id: 'panadol-extra',
        locale: 'ar',
      });
      expect(res.active_ingredient).toBe('Paracetamol');
      expect(res.alternatives).toHaveLength(1);
      expect(res.alternatives[0].canonical_url).toContain('/p/fevadol-500');
    });

    it('prepares transaction for OTC medicine with VAT breakdown', async () => {
      const res: any = await service.executeTool('prepare_transaction', {
        transaction_type: 'medicine_order',
        entity_id: 'panadol-extra',
        quantity: 2,
      });
      expect(res.can_checkout).toBe(true);
      expect(res.requires_prescription).toBe(false);
      expect(res.pricing.subtotal).toBe(31.0);
      expect(res.pricing.total_sar).toBe(35.65);
      expect(res.checkout_url).toContain('https://nabd.plus/ar/cart/checkout');
    });

    it('strictly ENFORCES prescription rules: blocks AI checkout for Rx medicine', async () => {
      const res: any = await service.executeTool('prepare_transaction', {
        transaction_type: 'medicine_order',
        entity_id: 'antibiotic-amoxil',
        quantity: 1,
      });
      expect(res.can_checkout).toBe(false);
      expect(res.requires_prescription).toBe(true);
      expect(res.error_code).toBe('RX_VERIFICATION_REQUIRED');
      expect(res.prescription_upload_url).toContain('/pharmacy/scan-prescription');
    });
  });
});
