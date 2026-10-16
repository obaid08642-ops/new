import { ProviderImageProcessorService } from './provider-image-processor.service';

describe('GET /provider/profile/image/status', () => {
  const svc = (meta: unknown) => {
    const s: any = Object.create(ProviderImageProcessorService.prototype);
    s.metadataModel = { findOne: async () => meta };
    return s as ProviderImageProcessorService;
  };

  it('answers "none" for a provider who never had a photo processed (it threw 404 on every profile editor open)', async () => {
    await expect(svc(null).getStatus('prov-1')).resolves.toEqual({ owner_id: 'prov-1', processingStatus: 'none' });
  });

  it('still returns the processing record when there is one', async () => {
    const out: any = await svc({ owner_id: 'prov-1', owner_type: 'doctor', processingStatus: 'completed', processedImageUrl: 'https://cdn/x.png' }).getStatus('prov-1');
    expect(out.processingStatus).toBe('completed');
    expect(out.processedImageUrl).toBe('https://cdn/x.png');
  });
});
