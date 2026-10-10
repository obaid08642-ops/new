import { EntityGraphService } from './entity-graph.service';

// OC-C C-9: explore filters by facility type / service and returns review counts.
function serviceFor() {
  const service: any = Object.create(EntityGraphService.prototype);
  const doctorFind = jest.fn().mockReturnValue({
    project: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) }),
  });
  const facFind = jest.fn().mockReturnValue({
    project: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) }),
  });
  service.connection = {
    collection: jest.fn((name: string) => ({ find: name === 'provider_profiles' ? doctorFind : facFind })),
  };
  return { service: service as EntityGraphService, doctorFind, facFind };
}

describe('OC C-9 explore filters', () => {
  it('filters facilities by type', async () => {
    const { service, facFind } = serviceFor();
    await service.explore({ city: 'Jeddah', type: 'pharmacy' });
    const q = facFind.mock.calls[0][0];
    expect(q.type).toBeDefined();
    expect(q.type.toString()).toMatch(/pharmacy/i);
  });

  it('filters facilities by service slug', async () => {
    const { service, facFind } = serviceFor();
    await service.explore({ city: 'Jeddah', type: 'lab', service: 'cbc' });
    const q = facFind.mock.calls[0][0];
    expect(String(q.departments).toLowerCase()).toContain('cbc');
  });

  it('returns reviews_count on doctors', async () => {
    const service: any = Object.create(EntityGraphService.prototype);
    let proj: any = null;
    service.connection = {
      collection: jest.fn((name: string) => ({
        find: jest.fn().mockReturnValue({
          project: jest.fn().mockImplementation((p: any) => { if (name === 'provider_profiles') proj = p; return { limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) }; }),
        }),
      })),
    };
    await service.explore({});
    expect(proj).toMatchObject({ reviews_count: 1 });
  });
});
