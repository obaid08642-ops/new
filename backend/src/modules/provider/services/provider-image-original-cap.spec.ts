import sharp from 'sharp';
import { PROVIDER_ORIGINAL_MAX_PX, ProviderImageProcessorService } from './provider-image-processor.service';

// Cloudinary is over its plan: the stored original of a provider photo is capped at 1600 px (it used to be stored as uploaded, up to 4000x4000).
describe('the stored original of a provider photo is capped', () => {
  async function run(width: number, height: number) {
    const png = await sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 60 } } }).png().toBuffer();
    const uploads: Array<{ key: string; data: Buffer }> = [];
    const storage = { upload: jest.fn(async (i: any) => { uploads.push({ key: i.customKey, data: Buffer.from(i.data_base64, 'base64') }); return { id: `id-${uploads.length}` }; }), retire: jest.fn(async () => undefined) };
    const meta = { updateOne: jest.fn(async () => ({})), findOne: jest.fn(() => ({ lean: async () => null })) };
    const job: any = { id: 'j1', _id: 'j1', owner_id: 'o1', data_base64: png.toString('base64'), save: jest.fn(async () => undefined) };
    const svc = new ProviderImageProcessorService(meta as any, { updateOne: jest.fn(async () => ({})) } as any, { updateOne: jest.fn(async () => ({})) } as any, { create: jest.fn(async () => ({})) } as any, storage as any);
    await (svc as any).processImage(job);
    const size = async (suffix: string) => { const m = await sharp(uploads.find((u) => u.key.includes(`/${suffix}/`))!.data).metadata(); return [m.width, m.height]; };
    return { original: await size('original'), large: await size('large'), small: await size('small') };
  }

  it('a 3000x2000 photo is stored at 1600x1067, the other versions are unchanged', async () => {
    expect(PROVIDER_ORIGINAL_MAX_PX).toBe(1600);
    const r = await run(3000, 2000);
    expect(r.original).toEqual([1600, 1067]);
    expect(r.large).toEqual([800, 533]);
    expect(r.small).toEqual([200, 133]);
  });

  it('a portrait photo is capped on its height', async () => {
    expect((await run(2000, 4000)).original).toEqual([800, 1600]);
  });

  it('a photo already under the cap is never enlarged', async () => {
    expect((await run(1000, 800)).original).toEqual([1000, 800]);
  });
});
