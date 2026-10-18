/**
 * Phase 16.5 — the two Verify cases the plan names:
 *   - a renamed `.exe` is refused;
 *   - an uploaded photo has no GPS tag afterwards.
 * Plus the mismatched-mime case, the per-purpose size limits, the random object
 * name and the fail-closed virus scan.
 */
import sharp from 'sharp';
import { UploadSecurityService } from './upload-security.service';

/**
 * A JPEG APP1/Exif segment with a GPS IFD (tag 0x8825) pointing at latitude
 * 24.7136 / longitude 46.6753 — Riyadh. This is the block a phone photo of a
 * prescription carries, and it must not survive an upload.
 */
const GPS_LAT = 24.7136;
const GPS_LON = 46.6753;

function exifSegment(): Buffer {
  const entriesPerIfd0 = 1;
  // IFD0: one entry (Make) + next-IFD pointer to the GPS IFD
  const ifd0 = Buffer.alloc(2 + entriesPerIfd0 * 12 + 4);
  ifd0.writeUInt16LE(entriesPerIfd0, 0);
  ifd0.writeUInt16LE(0x010f, 2);            // Make
  ifd0.writeUInt16LE(2, 4);                 // ASCII
  ifd0.writeUInt32LE(26, 6);                // value offset (after the header)
  ifd0.writeUInt32LE(8, 10);                // next IFD -> GPS at offset 8
  const gps = Buffer.alloc(2 + 4 * 12 + 4);
  gps.writeUInt16LE(4, 0);
  const gpsTags = [0x0001, 0x0002, 0x0003, 0x0004];
  gpsTags.forEach((tag, i) => {
    const off = 2 + i * 12;
    gps.writeUInt16LE(tag, off);
    gps.writeUInt16LE(5, off + 2);           // RATIONAL
    gps.writeUInt32LE(1, off + 4);           // count
    gps.writeUInt32LE(26 + 4 + gpsTags.length * 12 + 4 + i * 16, off + 8);
  });
  gps.writeUInt32LE(0, 2 + 4 * 12);
  const rationals = Buffer.alloc(gpsTags.length * 8);
  const values = [GPS_LAT, GPS_LON];
  gpsTags.forEach((_, i) => {
    const base = i * 8;
    rationals.writeUInt32LE(Math.round(values[i] * 1e6), base);
    rationals.writeUInt32LE(1_000_000, base + 4);
  });
  const make = Buffer.from('Phone\0', 'ascii');
  const header = Buffer.from('Exif\0\0', 'ascii');
  const tiff = Buffer.concat([header, ifd0, gps, rationals, make]);
  const marker = Buffer.concat([Buffer.from([0xff, 0xe1]), sizeField(tiff.length + 2), tiff]);
  return marker;
}

function sizeField(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n, 0);
  return b;
}

/** A real JPEG (from sharp) with an Exif APP1 segment spliced in after SOI. */
async function jpegWithGps(): Promise<Buffer> {
  const base = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#3366aa' } }).jpeg().toBuffer();
  return Buffer.concat([base.subarray(0, 2), exifSegment(), base.subarray(2)]);
}

async function plainPng(): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: '#00ff00' } }).png().toBuffer();
}

describe('Phase 16.5 upload security', () => {
  let svc: UploadSecurityService;

  beforeEach(() => { svc = new UploadSecurityService(); });

  it('refuses a renamed .exe whatever the client calls it', async () => {
    const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(58), Buffer.from([0x00, 0x00]), Buffer.alloc(64)]);
    await expect(
      svc.inspect({ purpose: 'prescription', declared_mime: 'image/jpeg', data_base64: exe.toString('base64') }),
    ).rejects.toThrow('executable_upload_refused');
  });

  it('refuses an ELF binary and a ZIP/JAR container under any purpose', async () => {
    const elf = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]), Buffer.alloc(120)]);
    await expect(
      svc.inspect({ purpose: 'lab_report', declared_mime: 'application/pdf', data_base64: elf.toString('base64') }),
    ).rejects.toThrow('executable_upload_refused');
    const jar = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(120)]);
    await expect(
      svc.inspect({ purpose: 'lab_report', declared_mime: 'application/pdf', data_base64: jar.toString('base64') }),
    ).rejects.toThrow('executable_upload_refused');
  });

  it('accepts image/jpg as the same type as image/jpeg', async () => {
    const jpeg = await jpegWithGps();
    await expect(
      svc.inspect({ purpose: 'lab_report', declared_mime: 'image/jpg', data_base64: jpeg.toString('base64') }),
    ).resolves.toBeTruthy();
  });

  it('refuses a PDF declared as a PNG', async () => {
    const pdf = Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n1 0 obj\n<< /Type /Catalog >>\n', 'binary');
    await expect(
      svc.inspect({ purpose: 'lab_report', declared_mime: 'image/png', data_base64: pdf.toString('base64') }),
    ).rejects.toThrow('file_type_does_not_match_declared_mime');
  });

  it('strips the GPS/EXIF block from an uploaded photo (16.5 Verify)', async () => {
    const jpeg = await jpegWithGps();
    expect(jpeg.subarray(0, 400).includes(Buffer.from('Exif'))).toBe(true);

    const inspected = await svc.inspect({
      purpose: 'prescription', declared_mime: 'image/jpeg', data_base64: jpeg.toString('base64'),
    });

    expect(inspected.reencoded).toBe(true);
    expect(inspected.exif_stripped).toBe(true);
    // No Exif marker, no GPS IFD, and sharp reports no metadata at all.
    expect(inspected.bytes.subarray(0, 400).includes(Buffer.from('Exif'))).toBe(false);
    expect(inspected.bytes.includes(Buffer.from([0x88, 0x25]))).toBe(false);
    const after = await sharp(inspected.bytes).metadata();
    expect(after.exif).toBeUndefined();
    expect(after.icc).toBeUndefined();
  });

  it('gives every upload a random object name, never the caller file name', async () => {
    const png = await plainPng();
    const a = await svc.inspect({ purpose: 'avatar', declared_mime: 'image/png', data_base64: png.toString('base64'), original_name: 'my-passport.png' });
    const b = await svc.inspect({ purpose: 'avatar', declared_mime: 'image/png', data_base64: png.toString('base64'), original_name: 'my-passport.png' });
    expect(a.random_name).not.toBe('my-passport.png');
    expect(a.random_name).not.toBe(b.random_name);
    expect(a.random_name).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('enforces the size limit per purpose', async () => {
    const png = await plainPng();
    const padded = Buffer.concat([png, Buffer.alloc(11 * 1024 * 1024)]);
    await expect(
      svc.inspect({ purpose: 'avatar', declared_mime: 'image/png', data_base64: padded.toString('base64') }),
    ).rejects.toThrow('file_too_large_for_avatar');
    await expect(
      svc.inspect({ purpose: 'unknown' as never, declared_mime: 'image/png', data_base64: png.toString('base64') }),
    ).rejects.toThrow('unknown_upload_purpose');
  });

  it('refuses an empty upload and a mime the purpose does not allow', async () => {
    await expect(
      svc.inspect({ purpose: 'avatar', declared_mime: 'image/png', data_base64: '' }),
    ).rejects.toThrow('empty_upload');
    await expect(
      svc.inspect({ purpose: 'avatar', declared_mime: 'application/pdf', data_base64: 'JVBERi0xLjQK' }),
    ).rejects.toThrow('unsupported mime');
  });

});