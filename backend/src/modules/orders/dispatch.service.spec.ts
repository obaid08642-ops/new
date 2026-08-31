import { DispatchService } from './dispatch.service';

describe('DispatchService governed standard radius ladder', () => {
  it('uses the canonical 3 → 5 → 8 km standard stages', () => {
    const service = new DispatchService({} as any, {} as any, {} as any);
    expect(service.RADIUS_LADDER).toEqual([3, 5, 8]);
  });
});
