import { Connection } from 'mongoose';
import { ContractPdfService } from './contract-pdf.service';

describe('ContractPdfService signature source', () => {
  it('does not fetch arbitrary user-provided URLs', async () => {
    const collection = { findOne: jest.fn() };
    const service = new ContractPdfService({ collection: () => collection } as unknown as Connection);
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    const load = (service as unknown as { loadSignature(value: string): Promise<Buffer | null> }).loadSignature;
    await expect(load.call(service, 'http://127.0.0.1/latest/meta-data')).resolves.toBeNull();
    expect(collection.findOne).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('does not fetch an untrusted external URL stored on a storage record', async () => {
    const collection = {
      findOne: jest.fn().mockResolvedValue({
        id: 'signature-1', backend: 'external', external_url: 'http://169.254.169.254/latest/meta-data',
      }),
    };
    const service = new ContractPdfService({ collection: () => collection } as unknown as Connection);
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    const load = (service as unknown as { loadSignature(value: string): Promise<Buffer | null> }).loadSignature;
    await expect(load.call(service, 'signature-1')).resolves.toBeNull();
    expect(collection.findOne).toHaveBeenCalledWith({ id: { $eq: 'signature-1' }, deleted: { $ne: true } });
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  // Live finding: a corrupt signature upload made submit answer 500.
  it('a corrupt signature image is a 400 (sign again), not a crash', async () => {
    const service = new ContractPdfService({ collection: () => ({ findOne: jest.fn() }) } as unknown as Connection);
    const bad = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64');
    await expect(service.generate({ signatureUrl: bad, signerName: 'x', signerRole: 'owner' } as any)).rejects.toMatchObject({ status: 400, message: 'signature_image_invalid' });
  });
});
