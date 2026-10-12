import { EntityGraphService } from './entity-graph.service';

// OC-C C-19 (787): explore lists lab/radiology/pharmacy providers by city.
function serviceFor() {
  const service: any = Object.create(EntityGraphService.prototype);
  const queries: any[] = [];
  service.connection = {
    collection: jest.fn(() => ({
      find: jest.fn().mockImplementation((q: any) => { queries.push(q); return { project: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) }) }; }),
    })),
  };
  return { service: service as EntityGraphService, queries };
}

describe('OC C-19 explore provider types', () => {
  const textOf = (queries: any[]) => queries.map((q: any) => JSON.stringify(q, (_k, v) => (v instanceof RegExp ? v.toString() : v))).join('|');

  it('queries radiology providers in the city', async () => {
    const { service, queries } = serviceFor();
    const out: any = await service.explore({ city: 'Jeddah', type: 'radiology', service: 'MRIK' });
    const s = textOf(queries);
    expect(s).toContain('radiology');
    expect(s).toContain('Jeddah');
    expect(Array.isArray(out.providers)).toBe(true);
  });

  it('queries lab providers in the city', async () => {
    const { service, queries } = serviceFor();
    await service.explore({ city: 'Riyadh', type: 'lab' });
    expect(textOf(queries)).toContain('lab');
  });
});
