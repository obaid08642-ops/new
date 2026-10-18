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
 * Every upload is also scanned by ClamAV (`ClamavService`): an infected file is refused everywhere; when the scanner cannot
 * answer, production (or UPLOAD_SCAN=required) refuses the upload and a dev container without ClamAV lets it through with a
 * warning, so a missing scanner can never become the production behaviour.
 */
import { BadRequestException, Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ClamavService } from './clamav.service';

export type Purpose = 'prescription' | 'avatar' | 'lab_report' | 'chat_attachment' | 'catalogue';

/** The purposes of POST /media/upload (media.schema MEDIA_PURPOSES) as upload purposes. */
export const MEDIA_PURPOSE_TO_UPLOAD: Record<string, Purpose> = { order_prescription: 'prescription', chat: 'chat_attachment', avatar: 'avatar', report: 'lab_report' };

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


const MEDIA_KINDS: Record<Purpose, Array<'image' | 'pdf' | 'audio' | 'office'>> = {
  prescription: ['image', 'pdf'],
  avatar: ['image'],
  catalogue: ['image'],
  lab_report: ['image', 'pdf', 'audio', 'office'],
  chat_attachment: ['image', 'pdf', 'audio', 'office'],
};

/** What POST /media/upload accepts besides photos and PDFs: voice notes, and office documents patients attach to a chat or report. */
export interface MediaType { mime: string; ext: string; kind: 'image' | 'pdf' | 'audio' | 'office' }

/**
 * Read the type of a media upload from its first bytes. Unlike `sniffMimeType` this knows the audio and office formats the
 * chat accepts; anything executable, any other ZIP/JAR, and macro-enabled Office files return null (refused upstream).
 */
export function sniffMediaType(buf: Buffer): MediaType | null {
  const base = sniffMimeType(buf);
  if (base === 'image/jpeg') return { mime: 'image/jpeg', ext: 'jpg', kind: 'image' };
  if (base === 'image/png') return { mime: 'image/png', ext: 'png', kind: 'image' };
  if (base === 'image/webp') return { mime: 'image/webp', ext: 'webp', kind: 'image' };
  if (base === 'application/pdf') return { mime: 'application/pdf', ext: 'pdf', kind: 'pdf' };
  const head = buf.subarray(0, 6).toString('latin1');
  if (head === 'GIF87a' || head === 'GIF89a') return { mime: 'image/gif', ext: 'gif', kind: 'image' };
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x41, 0x56, 0x45], 8)) return { mime: 'audio/wav', ext: 'wav', kind: 'audio' };
  if (buf.subarray(0, 3).toString('latin1') === 'ID3' || (buf.length > 1 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return { mime: 'audio/mpeg', ext: 'mp3', kind: 'audio' };
  if (buf.length > 12 && buf.subarray(4, 8).toString('latin1') === 'ftyp') return { mime: 'audio/mp4', ext: 'm4a', kind: 'audio' };
  // Word / Excel 97-2003 (OLE2 compound file). Macros live inside it and ClamAV reads them; the container itself is allowed.
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return { mime: 'application/x-ole-storage', ext: 'doc', kind: 'office' };
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
    // OOXML (docx, xlsx) is a ZIP whose first entry is [Content_Types].xml; a JAR starts with META-INF. A macro project means
    // the file is a docm / xlsm in disguise.
    const nameLength = buf.length > 30 ? buf.readUInt16LE(26) : 0;
    const firstEntry = buf.subarray(30, 30 + nameLength).toString('latin1');
    if (firstEntry !== '[Content_Types].xml') return null;
    if (buf.includes(Buffer.from('vbaProject.bin', 'latin1'))) return null;
    return { mime: 'application/vnd.openxmlformats-officedocument', ext: 'docx', kind: 'office' };
  }
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

  constructor(@Optional() private readonly clamav?: ClamavService) {}

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

    // 16.5: the antivirus sees the bytes as they were sent, before anything is re-encoded.
    await this.assertClean(bytes);
    if (normaliseMime(detectedMime) === 'application/pdf') this.assertNoActivePdfContent(bytes);

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
   * Inspect one multipart media upload (POST /media/upload): the type comes from the bytes, an executable or a macro Office file
   * is refused, the antivirus scans the bytes, a photo is re-encoded without its EXIF/GPS, a PDF may not carry active content,
   * and the object name and extension are chosen here, never taken from the caller's file name.
   */
  async inspectMedia(input: { purpose: Purpose; declared_mime: string; bytes: Buffer }): Promise<{ bytes: Buffer; mime: string; ext: string; kind: MediaType['kind']; size_bytes: number }> {
    const { purpose, declared_mime: declared } = input;
    if (!(purpose in PURPOSE_LIMITS)) throw new BadRequestException('unknown_upload_purpose');
    if (!input.bytes?.length) throw new BadRequestException('empty_upload');
    if (input.bytes.length > PURPOSE_LIMITS[purpose]) throw new BadRequestException(`file_too_large_for_${purpose}`);
    const baseDetected = sniffMimeType(input.bytes);
    const forbidden = baseDetected ? FORBIDDEN_SIGNATURES[baseDetected] : undefined;
    // (a ZIP is a JAR to `sniffMimeType`; an OOXML document is a ZIP too, so it is judged by `sniffMediaType` below)
    if (forbidden && baseDetected !== 'application/java-archive') throw new BadRequestException(forbidden);
    const type = sniffMediaType(input.bytes);
    if (!type) {
      if (baseDetected === 'application/java-archive') {
        throw new BadRequestException(input.bytes.includes(Buffer.from('vbaProject.bin', 'latin1')) ? 'macro_document_refused' : 'executable_upload_refused');
      }
      throw new BadRequestException('file_type_could_not_be_detected');
    }
    // photos, avatars and prescriptions are pictures (and PDFs for prescriptions); chat and reports may also carry voice notes and documents
    if (!MEDIA_KINDS[purpose].includes(type.kind)) throw new BadRequestException('file_type_does_not_match_declared_mime');
    // a declared picture or PDF must be one; other declared types (clients disagree on audio and office names) follow the bytes
    const d = normaliseMime(String(declared || '').toLowerCase());
    if ((d.startsWith('image/') && type.kind !== 'image') || (d === 'application/pdf' && type.kind !== 'pdf')) {
      throw new BadRequestException('file_type_does_not_match_declared_mime');
    }

    await this.assertClean(input.bytes);
    if (type.kind === 'pdf') this.assertNoActivePdfContent(input.bytes);

    let out = input.bytes;
    let mime = type.mime;
    let ext = type.ext;
    if (type.kind === 'image' && type.mime !== 'image/gif') {
      const clean = await this.reencodeWithoutMetadata(out);
      if (clean) { out = clean; mime = 'image/jpeg'; ext = 'jpg'; }
    }
    return { bytes: out, mime, ext, kind: type.kind, size_bytes: out.length };
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
   * 16.5: scan with ClamAV. An infected file is refused in every environment. When the scanner cannot answer (not configured,
   * unreachable, timed out, an unreadable reply) the upload is refused with 503 in production or when UPLOAD_SCAN=required;
   * elsewhere it is let through with a warning (a developer's machine has no ClamAV).
   */
  async assertClean(data: Buffer): Promise<void> {
    const verdict = this.clamav ? await this.clamav.scan(data) : ({ status: 'unavailable', reason: 'clamd_not_wired' } as const);
    if (verdict.status === 'clean') return;
    if (verdict.status === 'infected') {
      this.logger.warn(`upload refused: infected (${verdict.signature})`);
      throw new BadRequestException({ message: 'file_infected', code: 'file_infected', statusCode: 400 });
    }
    if (this.scanRequired()) {
      this.logger.error(`upload refused: the virus scanner is unavailable (${verdict.reason})`);
      throw new ServiceUnavailableException('virus_scanner_unavailable');
    }
    this.logger.warn(`virus scan unavailable (${verdict.reason}); upload allowed outside production`);
  }

  private scanRequired(): boolean {
    const setting = (process.env.UPLOAD_SCAN || '').toLowerCase();
    if (setting === 'required') return true;
    if (setting === 'optional') return false;
    return process.env.NODE_ENV === 'production';
  }

  /**
   * A PDF that can run something is refused: JavaScript, launch actions, embedded files, rich media. A prescription, a lab
   * report or a chat attachment never needs them. This reads the raw bytes, so it is a floor (obfuscated names slip through
   * it); ClamAV is the other half.
   */
  assertNoActivePdfContent(bytes: Buffer): void {
    const text = bytes.toString('latin1');
    if (/\/(JavaScript|JS|Launch|EmbeddedFile|EmbeddedFiles|RichMedia|XFA|SubmitForm|ImportData)\b/.test(text) || /\/OpenAction\b[^>]{0,200}\/(JavaScript|JS|Launch)\b/.test(text)) {
      throw new BadRequestException({ message: 'pdf_active_content_refused', code: 'pdf_active_content_refused', statusCode: 400 });
    }
  }
}
