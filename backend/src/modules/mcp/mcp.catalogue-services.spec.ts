import { McpService } from './mcp.service';

/** search_entities also finds lab tests, radiology scans and nursing services of the approved catalogue (not only doctors and facilities). */
describe('McpService search_entities: lab, radiology and nursing services', () => {
  const finds: Array<{ col: string; filter: any }> = [];
  const rowsByCol: Record<string, any[]> = {
    lab_services: [{ id: 'lab1', short_code: 'CBC', name_ar: 'صورة دم', name_en: 'Complete blood count', price: 40 }],
    radiology_services: [{ id: 'rad1', name_ar: 'رنين الدماغ', name_en: 'MRI brain', price: 900 }],
    nursing_services: [{ id: 'nur1', name_ar: 'حقن منزلية', name_en: 'Home injection' }],
  };
  const connection: any = {
    collection: jest.fn((col: string) => ({
      find: jest.fn((filter: any) => {
        finds.push({ col, filter });
        return { limit: () => ({ toArray: async () => rowsByCol[col] ?? [] }) };
      }),
    })),
  };
  const intent = { extractIntent: jest.fn(async () => ({ entity_type: 'lab', specialty: null, canonical_path: '/x', location: null })) } as any;
  const graph = { explore: jest.fn(async () => ({ doctors: [], facilities: [] })) } as any;
  const service = new McpService(intent, graph, {} as any, connection);
  const call = (args: Record<string, unknown>) => (service as any).toolSearchEntities(args);

  beforeEach(() => { finds.length = 0; graph.explore.mockClear(); });

  it.each([
    ['lab', 'lab_services', 'https://nabd.plus/en/labs/CBC/riyadh'],
    ['radiology', 'radiology_services', 'https://nabd.plus/en/diagnostics/radiology/rad1'],
    ['nursing', 'nursing_services', 'https://nabd.plus/en/home-care/services/nur1'],
  ])('entity_type=%s reads only the approved %s and returns its page', async (kind, col, url) => {
    const out = await call({ query: 'x', entity_type: kind, locale: 'en' });
    expect(graph.explore).not.toHaveBeenCalled();
    expect(finds.map((f) => f.col)).toEqual([col]);
    expect(out.results).toHaveLength(1);
    expect(out.results[0]).toMatchObject({ entity_type: kind, canonical_url: url });
    expect(finds[0].filter).toMatchObject({ active: true, is_deleted: { $ne: true } });
    if (kind !== 'nursing') expect(finds[0].filter).toMatchObject({ public_eligibility: true, medical_review_status: 'approved' });
  });

  it('a service nobody offers yet is still listed (no provider filter)', async () => {
    const out = await call({ query: 'x', entity_type: 'radiology', locale: 'ar' });
    expect(JSON.stringify(finds[0].filter)).not.toMatch(/provider/);
    expect(out.results[0].name).toBe('رنين الدماغ');
  });

  it('entity_type=all (or none) adds a few services of each kind after doctors and facilities', async () => {
    const out = await call({ query: 'x', locale: 'en' });
    expect(graph.explore).toHaveBeenCalled();
    expect(out.results.map((r: any) => r.entity_type)).toEqual(['lab', 'radiology', 'nursing']);
  });

  it('a search text with regex characters is escaped', async () => {
    await call({ query: 'a.b(c', entity_type: 'lab' });
    const re = finds[0].filter.$or[0].name_ar as RegExp;
    expect(re.test('a.b(c')).toBe(true);
    expect(re.test('aXb(c')).toBe(false);
  });
});
