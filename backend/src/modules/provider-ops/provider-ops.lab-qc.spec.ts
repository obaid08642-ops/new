import { ProviderOpsService } from './provider-ops.module';

describe('ProviderOpsService.labQc', () => {
  it('uses atomic $set and $push operators when rejecting a sample', async () => {
    const updateOne = jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const collection = jest.fn((name: string) => {
      if (name === 'labbookings') {
        return {
          findOne: jest.fn().mockResolvedValue({ id: 'lab-1', patient_id: 'patient-1', state: 'SCHEDULED', priority: 'normal' }),
          updateOne,
        };
      }
      return { insertOne: jest.fn(), findOne: jest.fn() };
    });
    const service = new ProviderOpsService({ collection } as any);

    await expect(service.labQc({ id: 'lab-user-1', role: 'lab' }, 'lab-1', 'sample_rejected', { reason: 'hemolyzed' }))
      .resolves.toEqual(expect.objectContaining({ ok: true, action: 'sample_rejected', booking_id: 'lab-1' }));

    expect(updateOne).toHaveBeenCalledWith(
      { id: 'lab-1' },
      expect.objectContaining({
        $set: expect.objectContaining({ sample_state: 'rejected', sample_reject_reason: 'hemolyzed' }),
        $push: expect.objectContaining({ qc_history: expect.objectContaining({ action: 'sample_rejected', by: 'lab-user-1' }) }),
      }),
    );
  });
});
