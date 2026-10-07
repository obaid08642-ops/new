import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import sharp from 'sharp';
import { PDFDocument, PDFName, PDFDict } from 'pdf-lib';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

function detectMimeFromBuffer(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length < 12) return null;

  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, Math.min(12, buffer.length));

  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
    return { mime: 'image/gif', ext: 'gif' };
  }
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { mime: 'application/pdf', ext: 'pdf' };
  }
  if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
    return { mime: 'application/msword', ext: 'doc' };
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' };
  }
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return { mime: 'audio/mpeg', ext: 'mp3' };
  }
  if (bytes[0] === 0x66 && bytes[1] === 0x74 && bytes[2] === 0x79 && bytes[3] === 0x70 &&
      bytes[4] === 0x4D && bytes[5] === 0x34 && bytes[6] === 0x41) {
    return { mime: 'audio/mp4', ext: 'm4a' };
  }
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
    return { mime: 'audio/wav', ext: 'wav' };
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' };
  }

  return null;
}

export interface UploadPurposeConfig {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  stripExif: boolean;
  scanWithClamav: boolean;
  sanitizePdf: boolean;
}

export const UPLOAD_PURPOSE_CONFIGS: Record<string, UploadPurposeConfig> = {
  avatar: {
    maxSizeBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    stripExif: true,
    scanWithClamav: true,
    sanitizePdf: false,
  },
  order_prescription: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    stripExif: true,
    scanWithClamav: true,
    sanitizePdf: true,
  },
  chat: {
    maxSizeBytes: 15 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'mp3', 'm4a', 'wav', 'doc', 'docx', 'xls', 'xlsx'],
    stripExif: true,
    scanWithClamav: true,
    sanitizePdf: true,
  },
  report: {
    maxSizeBytes: 25 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    stripExif: true,
    scanWithClamav: true,
    sanitizePdf: true,
  },
  suggestion: {
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    stripExif: true,
    scanWithClamav: true,
    sanitizePdf: false,
  },
  document: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['pdf', 'doc', 'docx'],
    stripExif: false,
    scanWithClamav: true,
    sanitizePdf: true,
  },
  general: {
    maxSizeBytes: 15 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'],
    stripExif: true,
    scanWithClamav: true,
    sanitizePdf: true,
  },
};

export interface SecureUploadResult {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  originalName: string;
  sanitized: boolean;
  exifStripped: boolean;
  clamavScanned: boolean;
  pdfSanitized: boolean;
}

@Injectable()
export class UploadSecurityService {
  private readonly logger = new Logger(UploadSecurityService.name);
  private clamavAvailable: boolean = false;
  private clamavChecked: boolean = false;

  constructor() {
    this.checkClamavAvailability();
  }

  private async checkClamavAvailability(): Promise<void> {
    if (this.clamavChecked) return;
    this.clamavChecked = true;
    try {
      await execAsync('clamscan --version');
      this.clamavAvailable = true;
      this.logger.log('ClamAV is available for virus scanning');
    } catch {
      this.clamavAvailable = false;
      this.logger.warn('ClamAV not installed — virus scanning will be skipped (install clamav for production)');
    }
  }

  async validateAndSecureUpload(
    buffer: Buffer,
    originalName: string,
    declaredMimeType: string,
    purpose: string = 'general',
  ): Promise<SecureUploadResult> {
    const config = UPLOAD_PURPOSE_CONFIGS[purpose] || UPLOAD_PURPOSE_CONFIGS.general;

    if (buffer.length > config.maxSizeBytes) {
      throw new BadRequestException(`File exceeds ${config.maxSizeBytes / (1024 * 1024)}MB limit for ${purpose}`);
    }

    const detected = detectMimeFromBuffer(buffer);
    if (!detected) {
      throw new BadRequestException('Unable to determine file type from content');
    }

    if (!config.allowedMimeTypes.includes(detected.mime)) {
      throw new BadRequestException(`File type ${detected.mime} not allowed for ${purpose}`);
    }

    if (declaredMimeType && declaredMimeType !== detected.mime) {
      this.logger.warn(`Mime type mismatch: declared=${declaredMimeType}, detected=${detected.mime}`);
      throw new BadRequestException('File type does not match declared mime type');
    }

    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    if (extension && !config.allowedExtensions.includes(extension)) {
      throw new BadRequestException(`File extension .${extension} not allowed for ${purpose}`);
    }

    let processedBuffer = buffer;
    let exifStripped = false;
    let sanitized = false;
    let pdfSanitized = false;
    let clamavScanned = false;

    const isImage = detected.mime.startsWith('image/') && detected.mime !== 'image/gif';

    if (isImage && config.stripExif) {
      try {
        processedBuffer = await this.stripExifAndReencode(processedBuffer, detected.mime, originalName);
        exifStripped = true;
        sanitized = true;
      } catch (error: any) {
        this.logger.warn(`Failed to strip EXIF: ${error?.message || error}`);
        throw new BadRequestException('Image processing failed — file may be corrupted');
      }
    }

    if (detected.mime === 'application/pdf' && config.sanitizePdf) {
      try {
        processedBuffer = await this.sanitizePdf(processedBuffer);
        pdfSanitized = true;
        sanitized = true;
      } catch (error: any) {
        this.logger.warn(`Failed to sanitize PDF: ${error?.message || error}`);
        throw new BadRequestException('PDF sanitization failed — file may be corrupted');
      }
    }

    if (config.scanWithClamav) {
      clamavScanned = await this.scanWithClamav(processedBuffer);
    }

    const checksum = crypto.createHash('sha256').update(processedBuffer).digest('hex');

    return {
      buffer: processedBuffer,
      mimeType: detected.mime,
      sizeBytes: processedBuffer.length,
      checksumSha256: checksum,
      originalName,
      sanitized,
      exifStripped,
      clamavScanned,
      pdfSanitized,
    };
  }

  private async stripExifAndReencode(buffer: Buffer, mimeType: string, originalName: string): Promise<Buffer> {
    const ext = (originalName.split('.').pop() || '').toLowerCase();
    const mime = mimeType.toLowerCase();

    const pipeline =
      mime === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg'
        ? sharp(buffer).rotate().jpeg({ quality: 92, mozjpeg: true })
        : mime === 'image/png' || ext === 'png'
          ? sharp(buffer).rotate().png({ compressionLevel: 6 })
          : mime === 'image/webp' || ext === 'webp'
            ? sharp(buffer).rotate().webp({ quality: 90 })
            : null;

    if (!pipeline) return buffer;

    return await pipeline.toBuffer();
  }

  private async sanitizePdf(buffer: Buffer): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const node = page.node as PDFDict;
      const annots = node.get(PDFName.of('Annots'));
      if (annots) {
        node.set(PDFName.of('Annots'), pdfDoc.context.obj([]));
      }
    }

    const catalog = pdfDoc.catalog as PDFDict;
    const aa = catalog.get(PDFName.of('AA'));
    if (aa) {
      catalog.set(PDFName.of('AA'), pdfDoc.context.obj({}));
    }

    const openAction = catalog.get(PDFName.of('OpenAction'));
    if (openAction) {
      catalog.set(PDFName.of('OpenAction'), pdfDoc.context.obj({}));
    }

    const names = catalog.get(PDFName.of('Names')) as PDFDict | undefined;
    if (names) {
      const js = names.get(PDFName.of('JavaScript'));
      if (js) {
        names.set(PDFName.of('JavaScript'), pdfDoc.context.obj({}));
      }
      const embeddedFiles = names.get(PDFName.of('EmbeddedFiles'));
      if (embeddedFiles) {
        names.set(PDFName.of('EmbeddedFiles'), pdfDoc.context.obj({}));
      }
    }

    return Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
  }

  private async scanWithClamav(buffer: Buffer): Promise<boolean> {
    if (!this.clamavAvailable) {
      this.logger.debug('ClamAV not available, skipping virus scan');
      return false;
    }

    try {
      const tempFile = `/tmp/upload_scan_${crypto.randomBytes(16).toString('hex')}`;
      const fs = await import('fs');
      await fs.promises.writeFile(tempFile, buffer);

      const { stdout, stderr } = await execAsync(`clamscan --no-summary ${tempFile}`, { timeout: 30000 });

      await fs.promises.unlink(tempFile).catch(() => {});

      if (stdout.includes('FOUND')) {
        this.logger.error(`ClamAV detected malware: ${stdout}`);
        throw new BadRequestException('File rejected: malware detected');
      }

      this.logger.debug(`ClamAV scan clean: ${stdout}`);
      return true;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn(`ClamAV scan failed: ${error?.message || error}`);
      return false;
    }
  }

  generateSecureKey(purpose: string, ownerId: string): string {
    const randomPart = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString(36);
    return `${purpose}/${ownerId}/${timestamp}-${randomPart}`;
  }

  getConfigForPurpose(purpose: string): UploadPurposeConfig {
    return UPLOAD_PURPOSE_CONFIGS[purpose] || UPLOAD_PURPOSE_CONFIGS.general;
  }
}

export { UPLOAD_PURPOSE_CONFIGS as UploadPurposeConfigs };