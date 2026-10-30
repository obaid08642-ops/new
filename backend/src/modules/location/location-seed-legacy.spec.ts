import { LocationService } from './location.service';

/** The boot-time clean-up switches off legacy duplicates only; rows that carry a `source` (cities and districts added from OpenStreetMap) stay active. */
describe('seedInitialLocations legacy clean-up', () => {
  it('both deactivation filters exclude rows with a source', async () => {
    const updateMany = jest.fn().mockResolvedValue({});
    const bulkWrite = jest.fn().mockResolvedValue({});
    const model = { updateOne: jest.fn().mockResolvedValue({}), bulkWrite, updateMany } as unknown as ConstructorParameters<typeof LocationService>[0];
    const svc = new LocationService(model as never);
    await svc.seedInitialLocations();
    // the seed rows go in as a few bulk upserts that only set a row on insert, never one round trip per row
    const model2 = model as unknown as { updateOne: jest.Mock };
    expect(model2.updateOne).not.toHaveBeenCalled();
    expect(bulkWrite.mock.calls.length).toBeGreaterThan(0);
    const ops = bulkWrite.mock.calls.flatMap((c) => c[0] as Array<{ updateOne: { update: Record<string, unknown>; upsert: boolean } }>);
    expect(ops.every((o) => o.updateOne.upsert === true && Object.keys(o.updateOne.update).join() === '$setOnInsert')).toBe(true);
    expect(updateMany).toHaveBeenCalledTimes(2);
    for (const call of updateMany.mock.calls) expect(call[0].source).toEqual({ $in: [null, ''] });
  });
});
