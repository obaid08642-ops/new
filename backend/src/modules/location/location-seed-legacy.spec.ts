import { LocationService } from './location.service';

/** The boot-time clean-up switches off legacy duplicates only; rows that carry a `source` (cities and districts added from OpenStreetMap) stay active. */
describe('seedInitialLocations legacy clean-up', () => {
  it('both deactivation filters exclude rows with a source', async () => {
    const updateMany = jest.fn().mockResolvedValue({});
    const model = { updateOne: jest.fn().mockResolvedValue({}), updateMany } as unknown as ConstructorParameters<typeof LocationService>[0];
    const svc = new LocationService(model as never);
    await svc.seedInitialLocations();
    expect(updateMany).toHaveBeenCalledTimes(2);
    for (const call of updateMany.mock.calls) expect(call[0].source).toEqual({ $in: [null, ''] });
  });
});
