import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

/**
 * 14.20 / 59e0d6b: remove EXIF/XMP/IPTC (GPS location included) from still
 * images before they are stored, on every upload path. sharp drops all
 * metadata unless `.withMetadata()` is called; `.rotate()` applies the EXIF
 * orientation first. JPEG/PNG/WebP only (GIFs keep their frames; PDFs and
 * other files pass through). Fail closed: an image sharp cannot parse is
 * rejected, never stored raw.
 */
export async function stripImageMetadata(buffer: Buffer, mimeType: string, originalName = ''): Promise<Buffer> {
  const ext = (originalName.split('.').pop() || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  const pipeline =
    mime === 'image/jpeg' || mime === 'image/jpg' || ext === 'jpg' || ext === 'jpeg'
      ? sharp(buffer).rotate().jpeg({ quality: 92, mozjpeg: true })
      : mime === 'image/png' || ext === 'png'
        ? sharp(buffer).rotate().png({ compressionLevel: 6 })
        : mime === 'image/webp' || ext === 'webp'
          ? sharp(buffer).rotate().webp({ quality: 90 })
          : null;
  if (!pipeline) return buffer;
  try {
    return await pipeline.toBuffer();
  } catch {
    throw new BadRequestException('media_upload_failed');
  }
}
