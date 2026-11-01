import { isServable, isUnscanned, isPendingKey } from '../storage/pending-scan';
import { HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as PDFDocument from 'pdfkit';
import { createHash } from 'crypto';
import { drawBidi, wrapBidi } from '../../common/pdf-bidi';
import { alignBaselines, registerPdfFonts } from '../../common/pdf-fonts';
import { PROVIDER_AGREEMENT_KEY, majorOf } from '../legal/provider-agreement';

/**
 * Signed provider contract PDF.
 *
 * The PDF prints exactly what the provider read and accepted: the text and version of the `provider_agreement` policy recorded in
 * their acceptance (`legal_acceptances`, text kept in `legal_policy_snapshots`), never a text of its own. It carries the acceptance
 * (who, when, IP, device), the drawn signature and the signing time. It is only built from a clean signature and an acceptance;
 * every contract is a new stored version and nothing stored is ever changed (see provider-onboarding.module.ts).
 */

export interface ContractParty {
  profileId: string;
  accountId?: string | null;
  userId: string;
  providerType: string;
  nameAr?: string;
  nameEn?: string;
  licenseNumber?: string;
  crNumber?: string;
  city?: string;
  signerName?: string;
  signerRole?: string;
  signatureUrl?: string;
  email?: string;
  phone?: string;
  /** The account holder's own name (the signer name is typed on the form). */
  accountName?: string;
}

/** The text and the acceptance a contract is made from. */
export interface ContractAgreement {
  policy: { key: string; version: string; title_ar: string | null; title_en: string | null; content_ar: string; content_en: string; content_sha256_ar: string; content_sha256_en: string };
  acceptance: { id: string; version: string; accepted_at: Date; ip: string | null; device: string | null; platform: string | null; user_agent: string | null };
}

export interface ContractMeta { contractId: string; versionNo: number; signedAt: Date }
export interface ContractSignature { bytes: Buffer; sha256: string }

const typed = (status: number, code: string, extra: Record<string, unknown> = {}) => new HttpException({ statusCode: status, message: code, code, ...extra }, status);

/** The signature is still being scanned: nothing is signed yet, the app asks again in a minute. */
export const signaturePendingScan = () => typed(HttpStatus.LOCKED, 'signature_pending_scan', { retry_after_seconds: 60 });
export const signatureUnusable = () => typed(HttpStatus.BAD_REQUEST, 'signature_unusable');
export const agreementNotPublished = () => typed(HttpStatus.BAD_REQUEST, 'provider_agreement_not_published');
export const agreementNotAccepted = (version?: string) => typed(HttpStatus.CONFLICT, 'provider_agreement_not_accepted', { policy_key: PROVIDER_AGREEMENT_KEY, version: version ?? null });
export const agreementTextUnavailable = () => typed(HttpStatus.CONFLICT, 'provider_agreement_text_unavailable');

/**
 * One line of a policy written in Markdown (the legal texts in docs/legal are): `# Title` is a heading, `**bold**` and `__bold__`
 * lose their markers, `- item` gets a bullet. The words are never changed; a plain-text policy passes through as it is.
 */
export function policyLine(raw: string): { text: string; heading: boolean } {
  const h = /^\s{0,3}#{1,6}\s+(.*)$/.exec(raw);
  const body = (h ? h[1] : raw).replace(/(\*\*|__)/g, '').replace(/^\s*[-*]\s+/, '\u2022 ');
  return { text: body.trimEnd(), heading: !!h };
}

@Injectable()
export class ContractPdfService {
  private logger = new Logger('ContractPdf');

  constructor(@InjectConnection() private readonly conn: Connection) {}

  /**
   * The published agreement and the provider's latest acceptance of it. The accepted version's own text is read from the stored
   * snapshot; when the accepted version is still the current one the policy row itself is used (and kept as a snapshot).
   */
  async loadAgreement(userId: string): Promise<ContractAgreement> {
    const policy: any = await this.conn.collection('legal_policies').findOne({ key: PROVIDER_AGREEMENT_KEY });
    if (!policy || !String(policy.content_ar || policy.content_en || '').trim()) throw agreementNotPublished();
    const rows: any[] = await this.conn.collection('legal_acceptances')
      .find({ user_id: userId, policy_key: PROVIDER_AGREEMENT_KEY }).sort({ timestamp: -1 }).limit(20).toArray();
    // an acceptance holds for every minor version of the same major version; a new major asks again
    const acc = rows.find((r) => majorOf(r.version) === majorOf(policy.version));
    if (!acc) throw agreementNotAccepted(policy.version);
    let snap: any = await this.conn.collection('legal_policy_snapshots').findOne({ key: PROVIDER_AGREEMENT_KEY, version: acc.version });
    if (!snap && acc.version === policy.version) snap = policy; // accepted before snapshots existed, and not edited since
    if (!snap) throw agreementTextUnavailable();
    const sha = (t: unknown) => createHash('sha256').update(String(t ?? '')).digest('hex');
    return {
      policy: {
        key: PROVIDER_AGREEMENT_KEY, version: String(acc.version), title_ar: snap.title_ar ?? null, title_en: snap.title_en ?? null,
        content_ar: String(snap.content_ar ?? ''), content_en: String(snap.content_en ?? ''),
        content_sha256_ar: snap.content_sha256_ar || sha(snap.content_ar), content_sha256_en: snap.content_sha256_en || sha(snap.content_en),
      },
      acceptance: {
        id: String(acc._id), version: String(acc.version), accepted_at: acc.timestamp, ip: acc.ip ?? null, device: acc.device ?? null,
        platform: acc.platform ?? null, user_agent: acc.user_agent ?? null,
      },
    };
  }

  /**
   * The signature image, only from a clean scan. A signature still in the scan queue is 423 `signature_pending_scan` (no contract is
   * made yet); a missing, infected or unreadable one is 400 `signature_unusable`. There is no contract without a signature.
   */
  async resolveSignature(url?: string | null): Promise<ContractSignature> {
    if (!url) throw signatureUnusable();
    if (!url.startsWith('data:') && !/^https?:\/\//i.test(url) && url.length <= 256) {
      const obj: any = await this.conn.collection('storage_objects').findOne({ id: { $eq: url }, deleted: { $ne: true } });
      if (!obj) throw signatureUnusable();
      if (isUnscanned(obj.scan_status) || (isPendingKey(obj.external_key) && obj.scan_status !== 'infected')) throw signaturePendingScan();
      if (!isServable(obj)) throw signatureUnusable();
    }
    const bytes = await this.loadSignature(url);
    if (!bytes || !bytes.length) throw signatureUnusable();
    return { bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
  }

  private async readBoundedResponse(response: Response): Promise<Buffer | null> {
    if (!response.ok || !response.body) return null;
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 1_000_000) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_000_000) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), size);
  }

  private async loadSignature(url?: string): Promise<Buffer | null> {
    if (!url) return null;
    try {
      if (url.startsWith('data:')) {
        if (url.length > 1_400_000 || !/^data:image\/(png|jpeg|webp);base64,/i.test(url)) return null;
        const base64 = url.slice(url.indexOf(',') + 1);
        const decoded = Buffer.from(base64, 'base64');
        return decoded.length <= 1_000_000 ? decoded : null;
      }
      // Storage object ID (the app uploads the drawn signature to /storage and
      // sends back its id). Arbitrary http(s) URLs are never fetched here.
      if (/^https?:\/\//i.test(url) || url.length > 256) return null;
      const obj: any = await this.conn.collection('storage_objects').findOne({ id: { $eq: url }, deleted: { $ne: true } });
      if (!obj) return null;
      // A signature still in quarantine (or infected) is never embedded in a contract.
      if (!isServable(obj)) return null;
      if (typeof obj.data_base64 === 'string' && obj.data_base64.length <= 1_400_000) {
        const decoded = Buffer.from(obj.data_base64, 'base64');
        if (decoded.length <= 1_000_000) return decoded;
      }
      if (obj.backend === 's3' && obj.external_key && process.env.S3_BUCKET && process.env.S3_ENDPOINT) {
        const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
        const client = new S3Client({
          region: process.env.S3_REGION || 'auto',
          endpoint: process.env.S3_ENDPOINT,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
          },
          forcePathStyle: true,
        });
        const result = await client.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: obj.external_key }));
        if (Number(result.ContentLength) > 1_000_000) return null;
        const bytes = await result.Body?.transformToByteArray();
        return bytes && bytes.length <= 1_000_000 ? Buffer.from(bytes) : null;
      }
      if (obj.backend === 'cloudinary' && typeof obj.external_key === 'string' && /^[A-Za-z0-9/_-]{1,240}$/.test(obj.external_key)) {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        if (!cloudName || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return null;
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: cloudName,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          secure: true,
        });
        const signed = cloudinary.url(obj.external_key, {
          sign_url: obj.visibility !== 'public_read',
          secure: true,
          ...(obj.visibility === 'public_read' ? {} : { type: 'authenticated' }),
        });
        const parsed = new URL(signed);
        if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') return null;
        const res = await fetch(parsed, { redirect: 'error', signal: AbortSignal.timeout(5000) });
        return this.readBoundedResponse(res);
      }
    } catch (e: any) {
      this.logger.warn(`signature fetch failed: ${e.message}`);
    }
    return null;
  }


  /**
   * Builds the PDF. Returns the full SHA-256 of the FINAL bytes (the hash cannot be printed in the document it hashes; it is stored
   * with the row and shown beside it). The same inputs always give a document of the same text; only the PDF's own ids differ.
   */
  async generate(party: ContractParty, agreement: ContractAgreement, signature: ContractSignature, meta: ContractMeta): Promise<{ pdf: Buffer; sha256: string }> {
    const Doc: any = (PDFDocument as any).default || PDFDocument;
    const doc = new Doc({
      size: 'A4', margin: 50, bufferPages: true,
      info: { Title: 'Nabd Provider Partnership Agreement', Subject: `contract ${meta.contractId} v${meta.versionNo}; agreement ${agreement.policy.version}` },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const fonts = registerPdfFonts(doc);
    if (!fonts.arabic) { doc.end(); throw new ServiceUnavailableException('pdf_arabic_font_unavailable'); }
    const pdfDoc = alignBaselines(doc, fonts);
    const X = 50;
    const W = doc.page.width - 100;
    const bottom = doc.page.height - 70;
    let y = 50;
    const ink = '#111111';
    const muted = '#555555';
    const teal = '#0f766e';
    const when = (d: Date | string) => new Date(d).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    const room = (h: number) => { if (y + h > bottom) { doc.addPage(); y = 50; } };
    /** One logical paragraph: wrapped in reading order, each line ordered for display. */
    const para = (text: string, o: { size?: number; bold?: boolean; color?: string; gap?: number } = {}) => {
      const size = o.size ?? 10.5;
      const f = o.bold ? fonts.bold : fonts.reg;
      doc.fillColor(o.color ?? ink);
      for (const line of wrapBidi(pdfDoc, text, W, { fonts: f, size })) {
        room(size * 1.55);
        drawBidi(pdfDoc, line, X, y, W, { fonts: f, size });
        y += size * 1.55;
      }
      y += o.gap ?? 0;
    };
    const rule = () => { room(12); doc.moveTo(X, y).lineTo(X + W, y).strokeColor(teal).lineWidth(1.2).stroke(); y += 10; };

    // ── Header ──
    para('عقد شراكة مزود خدمة — منصة نبض', { size: 18, bold: true, color: teal, gap: 2 });
    para(`رقم العقد: ${meta.contractId} · الإصدار ${meta.versionNo}`, { size: 9, color: muted });
    para(`نص الاتفاقية: ${agreement.policy.title_ar || agreement.policy.key} — الإصدار ${agreement.policy.version}`, { size: 9, color: muted, gap: 4 });
    rule();

    // ── Parties ──
    para('أطراف الاتفاق', { size: 13, bold: true, gap: 2 });
    para('الطرف الأول: منصة نبض الصحية.');
    para(`الطرف الثاني: ${party.nameAr || party.nameEn || '—'} — مزود خدمة من فئة (${party.providerType}).`);
    if (party.licenseNumber) para(`رقم الترخيص: ${party.licenseNumber}`);
    if (party.crNumber) para(`السجل التجاري: ${party.crNumber}`);
    if (party.city) para(`المدينة: ${party.city}`);
    if (party.email) para(`البريد الإلكتروني: ${party.email}`);
    if (party.phone) para(`الجوال: ${party.phone}`);
    y += 6; rule();

    // ── The text the provider read and accepted, exactly as published ──
    para('نص الاتفاقية', { size: 13, bold: true, gap: 2 });
    const body = agreement.policy.content_ar || agreement.policy.content_en;
    for (const raw of body.split(/\r?\n/)) {
      if (!raw.trim()) { y += 5; continue; }
      const { text, heading } = policyLine(raw);
      para(text, { size: heading ? 12 : 10.5, bold: heading, gap: heading ? 2 : 1.5 });
    }
    y += 6; rule();

    // ── Acceptance and signature ──
    room(190);
    para('الموافقة والتوقيع', { size: 13, bold: true, gap: 2 });
    const a = agreement.acceptance;
    para(`وافق على نص الاتفاقية (الإصدار ${a.version}) بتاريخ: ${when(a.accepted_at)}`, { size: 10 });
    para(`عنوان الشبكة (IP): ${a.ip || '—'} · الجهاز: ${a.device || '—'} · المنصة: ${a.platform || '—'}`, { size: 9, color: muted });
    if (a.user_agent) para(`المتصفح/التطبيق: ${a.user_agent}`, { size: 8, color: muted });
    para(`اسم الموقّع: ${party.signerName || '—'}${party.signerRole ? ` (${party.signerRole})` : ''}`, { size: 10.5, bold: true });
    if (party.accountName) para(`صاحب الحساب: ${party.accountName}`, { size: 9, color: muted });
    para(`تاريخ ووقت التوقيع: ${when(meta.signedAt)}`, { size: 10.5, bold: true, gap: 4 });
    room(80);
    try {
      doc.image(signature.bytes, X + W - 150, y, { fit: [140, 64] });
    } catch {
      // A corrupt upload is not a signature: the provider signs again instead of getting a contract without one.
      doc.end();
      throw signatureUnusable();
    }
    y += 70;

    // ── Page footer: the contract and the agreement version on every page ──
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.page.margins.bottom = 0;
      doc.fillColor(muted);
      drawBidi(pdfDoc, `${meta.contractId} · v${meta.versionNo} · ${agreement.policy.key} ${agreement.policy.version} · ${i + 1}/${range.count}`, X, doc.page.height - 38, W, { fonts: fonts.reg, size: 8, align: 'left', base: 'ltr' });
    }

    doc.end();
    const pdf = await done;
    return { pdf, sha256: createHash('sha256').update(pdf).digest('hex') };
  }
}
