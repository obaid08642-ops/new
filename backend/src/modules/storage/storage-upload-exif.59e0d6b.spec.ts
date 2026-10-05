// 59e0d6b / 14.20: only the multipart media path stripped EXIF; the base64
// upload path (StorageService.upload: KYC documents, prescriptions, avatars)
// stored photos with their GPS location. Every image upload is now
// re-encoded without metadata before it is stored.
import sharp from 'sharp';
import { StorageService } from './storage.module';

jest.setTimeout(30_000);

async function jpegWithGps(): Promise<Buffer> {
  return sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 200, g: 10, b: 10 } } })
    .jpeg()
    .withExif({ IFD0: { Make: 'SyntheticCam' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '24/1 42/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '46/1 40/1 0/1' } })
    .toBuffer();
}

describe('StorageService.upload strips image metadata (GPS)', () => {
  it('the stored image has no EXIF; a pdf is stored unchanged', async () => {
    const raw = await jpegWithGps();
    expect((await sharp(raw).metadata()).exif).toBeDefined();
    const puts: Array<{ data_base64: string }> = [];
    const created: any[] = [];
    const svc: any = Object.create(StorageService.prototype);
    svc.logger = { error: jest.fn(), warn: jest.fn() };
    svc.adapter = { put: jest.fn(async (o: any) => { puts.push(o); return { backend: 'base64', data_base64: o.data_base64 }; }) };
    svc.model = { create: jest.fn(async (o: any) => { created.push(o); return { ...o, id: 'obj-1', toObject: () => o }; }) };
    const prev = process.env.S3_BUCKET;
    process.env.S3_BUCKET = process.env.S3_BUCKET || 'b'; process.env.S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://s3'; process.env.S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || 'k'; process.env.S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || 's';
    await svc.upload({ owner_account_id: 'u1', mime: 'image/jpeg', data_base64: raw.toString('base64'), original_name: 'kyc.jpg' }).catch((e: Error) => { throw e; });
    const stored = Buffer.from(puts[0].data_base64, 'base64');
    const meta = await sharp(stored).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.format).toBe('jpeg');
    expect(created[0].checksum_sha256).toBeDefined();
    const pdf = Buffer.from('%PDF-1.4 synthetic').toString('base64');
    await svc.upload({ owner_account_id: 'u1', mime: 'application/pdf', data_base64: pdf, original_name: 'a.pdf' });
    expect(puts[1].data_base64).toBe(pdf);
    if (prev === undefined) delete process.env.S3_BUCKET;
  });
});
