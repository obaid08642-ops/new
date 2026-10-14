/**
 * Phase 16.5 — uploads are checked by what they ARE, not by what they are called.
 *
 * A renamed `.exe` or a "PDF" whose bytes are a ZIP is refused; a photo is
 * re-encoded so its EXIF block (and with it the GPS coordinates of a patient's
 * home, which a prescription photo carries) never reaches storage; object names
 * are random, so nothing is guessed from the caller's file name.
 *
 * The type is read from the file's magic bytes by `sniffMimeType` below, which
 * only needs to know the formats this product accepts plus the executable
 * signatures it must refuse — so it stays a small, auditable function instead
 * of trusting the client or a heavyweight dependency.
 *
 * The antivirus hook is fail-CLOSED in production, so a missing ClamAV in a dev
 * container can never become the production behaviour.
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

export type Purpose = 'prescription' | 'avatar' | 'lab_report' | 'chat_attachment' | 'catalogue';

/** Per-purpose size limits. 16.5: "size limits per purpose". */
export const PURPOSE_LIMITS: Record<Purpose, number> = {
  prescription: 10 * 1024 * 1024,
  avatar: 5 * 1024 * 1024,
  lab_report: 15 * 1024 * 1024,
  chat_attachment: 10 * 1024 * 1024,
  catalogue: 5 * 1024 * 1024,
};

const ALLOWED: Record<Purpose, string[]> = {
  prescription: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
  lab_report: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  chat_attachment: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  catalogue: ['image/jpeg', 'image/png', 'image/webp'],
};

/** Signatures that are executable or archive-borne, whatever the name says. */
const FORBIDDEN_SIGNATURES: Record<string, string> = {
  'application/x-msdownload': 'executable_upload_refused',      // MZ / PE
  'application/x-dosexec': 'executable_upload_refused',          // MZ, DOS
  'application/x-executable': 'executable_upload_refused',       // ELF
  'application/x-mach-binary': 'executable_upload_refused',      // Mach-O
  'application/x-sh': 'script_upload_refused',                   // #! shell script
  'application/x-ms-shortcut': 'executable_upload_refused',      // LNK
  'application/java-archive': 'executable_upload_refused',       // JAR
  'application/x-sqlite3': 'upload_refused',                     // SQLite
};

/** `image/jpg` is the same type as `image/jpeg`; browsers send both. */
export function normaliseMime(mime: string): string {
  return mime === 'image/jpg' ? 'image/jpeg' : mime;
}

function startsWith(buf: Buffer, signature: number[], offset = 0): boolean {
  if (buf.length < offset + signature.length) return false;
  return signature.every((b, i) => buf[offset + i] === b);
}

/**
 * Read the type from the first bytes of a file. Returns null when the bytes
 * match nothing this product accepts — which is itself a refusal upstream.
 */
export function sniffMimeType(buf: Buffer): string | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buf.subarray(0, 2).toString('latin1') === 'MZ') {
    // MZ covers PE and DOS executables; the PE header at 0x80 confirms which.
    return buf.length > 0x84 && buf[0x80] === 0x50 && buf[0x81] === 0x45
      ? 'application/x-msdownload'
      : 'application/x-dosexec';
  }
  if (startsWith(buf, [0x7f, 0x45, 0x4c, 0x46])) return 'application/x-executable';
  if (startsWith(buf, [0xfe, 0xed, 0xfa, 0xce]) || startsWith(buf, [0xfe, 0xed, 0xfa, 0xcf])
    || startsWith(buf, [0xca, 0xfe, 0xba, 0xbe]) || startsWith(buf, [0xcf, 0xfa, 0xed, 0xfe])) {
    return 'application/x-mach-binary';
  }
  if (startsWith(buf, [0x23, 0x21])) return 'application/x-sh';
  if (startsWith(buf, [0x4c, 0x00, 0x00, 0x00, 0x01, 0x14, 0x02, 0x00])) return 'application/x-ms-shortcut';
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
    // A ZIP container: a JAR runs code, so it is refused outright.
    return 'application/java-archive';
  }
  if (buf.subarray(0, 15).toString('latin1') === 'SQLite format 3') return 'application/x-sqlite3';
  return null;
}

export interface UploadInspection {
  purpose: Purpose;
  declared_mime: string;
  detected_mime: string | null;
  bytes: Buffer;
  size_bytes: number;
  /** True when the image was re-encoded and its metadata is gone. */
  reencoded: boolean;
  exif_stripped: boolean;
  random_name: string;
}

@Injectable()
export class UploadSecurityService {
  private readonly logger = new Logger(UploadSecurityService.name);

  /**
   * Inspect one upload. Throws `BadRequestException` with a code; the caller
   * never sees a stack trace or a server path.
   */
  async inspect(input: {
    purpose: Purpose;
    declared_mime: string;
    data_base64: string;
    original_name?: string;
  }): Promise<UploadInspection> {
    const purpose = input.purpose;
    if (!(purpose in PURPOSE_LIMITS)) throw new BadRequestException('unknown_upload_purpose');

    const bytes: Buffer = Buffer.from(input.data_base64 || '', 'base64');
    if (!bytes.length) throw new BadRequestException('empty_upload');
    if (bytes.length > PURPOSE_LIMITS[purpose]) {
      throw new BadRequestException(`file_too_large_for_${purpose}`);
    }
    // `image/jpg` is the same type as `image/jpeg`; some clients still send it.
    if (!ALLOWED[purpose].includes(normaliseMime(input.declared_mime))) {
      throw new BadRequestException('unsupported mime: ' + input.declared_mime);
    }

    // 16.5: the type comes from the bytes, not from the client.
    const detectedMime = sniffMimeType(bytes);
    const forbidden = detectedMime ? FORBIDDEN_SIGNATURES[detectedMime] : undefined;
    if (forbidden) throw new BadRequestException(forbidden);
    if (!detectedMime) throw new BadRequestException('file_type_could_not_be_detected');
    if (!ALLOWED[purpose].includes(normaliseMime(detectedMime))) {
      throw new BadRequestException('file_type_does_not_match_declared_mime');
    }
    // The declared mime must also be the truth: a PDF announced as a PNG is a
    // mismatch whatever the purpose allows.
    if (normaliseMime(detectedMime) !== normaliseMime(input.declared_mime)) {
      throw new BadRequestException('file_type_does_not_match_declared_mime');
    }

    let out: Buffer = bytes;
    let reencoded = false;
    if (normaliseMime(detectedMime).startsWith('image/')) {
      const clean = await this.reencodeWithoutMetadata(out);
      if (clean) { out = clean; reencoded = true; }
    }

    return {
      purpose,
      declared_mime: input.declared_mime,
      detected_mime: detectedMime,
      bytes: out,
      size_bytes: out.length,
      reencoded,
      exif_stripped: reencoded,
      // 16.5: random object names, never the caller's.
      random_name: crypto.randomUUID(),
    };
  }

  /**
   * Re-encode an image so nothing survives but pixels. `sharp` without
   * `withMetadata()` writes a fresh file with no EXIF, no GPS and no comment.
   */
  private async reencodeWithoutMetadata(data: Buffer): Promise<Buffer | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sharp = require('sharp');
      const encoded: Buffer = await sharp(data).rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
      return Buffer.from(encoded);
    } catch (e: any) {
      // In production a failed re-encode must not let the original bytes through.
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(`image re-encode failed; refusing the upload: ${e?.message}`);
        throw new BadRequestException('image_could_not_be_sanitised');
      }
      this.logger.warn(`image re-encode skipped (non-production): ${e?.message}`);
      return null;
    }
  }

  /**
   * 16.5: scan with an antivirus. Fail-CLOSED in production: a scanner that is
   * missing or unreachable must refuse the upload, not wave it through.
   */
  async assertClean(data: Buffer, scan: (buffer: Buffer) => Promise<boolean>): Promise<void> {
    let clean = false;
    try {
      clean = await scan(data);
    } catch (e: any) {
      this.logger.error(`virus scan failed: ${e?.message}`);
      clean = false;
    }
    if (clean) return;
    if (process.env.NODE_ENV === 'production') throw new BadRequestException('file_failed_security_scan');
    this.logger.warn('virus scan unavailable outside production; upload allowed (dev only)');
  }
}