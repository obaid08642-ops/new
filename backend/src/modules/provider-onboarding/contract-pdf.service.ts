import { isServable, isUnscanned, isPendingKey } from '../storage/pending-scan';
import { HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as PDFDocument from 'pdfkit';
import { createHash } from 'crypto';
import { chunkParagraph, drawBidi, wrapBidi } from '../../common/pdf-bidi';
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


export type ContractLang = 'ar' | 'en';

/** Which annex (A to D) holds the terms of a provider type. Annex E (commissions and settlement) applies to every type. */
const ANNEX_FOR_TYPE: Record<string, string> = {
  pharmacy: 'A',
  doctor: 'B', hospital: 'B', clinic: 'B', facility: 'B',
  lab: 'C', laboratory: 'C', radiology: 'C',
  nursing: 'D', home_care: 'D',
};
const ANNEX_LETTER: Record<string, string> = { 'أ': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D', 'هـ': 'E', 'ه': 'E', A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' };
const ANNEX_HEADING = /^##\s+(?:ملحق|Annex)\s+(\S+?)\s*[:：]/;
const ANNEXES_TITLE = /^#\s+(?:الملاحق|Annexes)\b/;

export interface AgreementForType { lines: string[]; applied: string[]; omitted: string[] }

/**
 * The agreement as it applies to one provider type: the whole body (articles) and the annex of that type, then annex E (fees and
 * settlement, for everyone). The annexes of other types are left out and named, so the reader sees what was not printed. A text
 * with no annexes, or a type with no annex, is printed whole. No word of a printed part is changed.
 */
export function agreementForType(content: string, providerType: string): AgreementForType {
  const lines = String(content ?? '').split(/\r?\n/);
  const firstAnnex = lines.findIndex((l) => ANNEX_HEADING.test(l));
  const mine = ANNEX_FOR_TYPE[String(providerType || '').toLowerCase()];
  if (firstAnnex < 0 || !mine) return { lines, applied: [], omitted: [] };
  const titleAt = lines.findIndex((l, i) => i < firstAnnex && ANNEXES_TITLE.test(l));
  const bodyEnd = titleAt >= 0 ? titleAt : firstAnnex;
  const out = lines.slice(0, bodyEnd).filter((l) => l.trim() !== '---');
  if (titleAt >= 0) out.push(lines[titleAt]);
  const applied: string[] = []; const omitted: string[] = [];
  for (let i = firstAnnex; i < lines.length; ) {
    const m = ANNEX_HEADING.exec(lines[i]);
    if (!m) { i++; continue; }
    let j = i + 1;
    while (j < lines.length && !/^#{1,2}\s/.test(lines[j])) j++;
    const key = ANNEX_LETTER[m[1]] ?? m[1];
    const title = lines[i].replace(/^##\s+/, '').trim();
    if (key === mine || key === 'E') { applied.push(title); out.push(...lines.slice(i, j)); } else omitted.push(title);
    i = j;
  }
  return { lines: out, applied, omitted };
}

/** The words of the PDF around the policy text, in both languages. The policy text itself is never translated here. */
const LABELS = {
  ar: {
    title: 'عقد شراكة مزود خدمة — منصة نبض', number: (id: string, v: number) => `رقم العقد: ${id} · الإصدار ${v}`,
    text: (t: string, v: string) => `نص الاتفاقية: ${t} — الإصدار ${v}`,
    parties: 'أطراف الاتفاق', first: 'الطرف الأول: منصة نبض الصحية.',
    second: (n: string, t: string) => `الطرف الثاني: ${n} — مزود خدمة من فئة (${t}).`,
    license: 'رقم الترخيص', cr: 'السجل التجاري', city: 'المدينة', email: 'البريد الإلكتروني', phone: 'الجوال',
    agreement: 'نص الاتفاقية', omitted: (list: string[]) => `ملاحق الاتفاقية التي لا تنطبق على نوع مقدم الخدمة هذا ولم تُطبع: ${list.join('، ')}.`,
    signing: 'الموافقة والتوقيع',
    accepted: (v: string, when: string) => `وافق على نص الاتفاقية (الإصدار ${v}) بتاريخ: ${when}`,
    net: (ip: string, dev: string, pl: string) => `عنوان الشبكة (IP): ${ip} · الجهاز: ${dev} · المنصة: ${pl}`,
    agent: (ua: string) => `المتصفح/التطبيق: ${ua}`,
    signer: (n: string, r: string) => `اسم الموقّع: ${n}${r ? ` (${r})` : ''}`, holder: (n: string) => `صاحب الحساب: ${n}`,
    signedAt: (when: string) => `تاريخ ووقت التوقيع: ${when}`,
  },
  en: {
    title: 'Nabd Platform — Provider Partnership Agreement', number: (id: string, v: number) => `Contract no.: ${id} · Version ${v}`,
    text: (t: string, v: string) => `Agreement text: ${t} — version ${v}`,
    parties: 'Parties', first: 'First party: Nabd Health Platform.',
    second: (n: string, t: string) => `Second party: ${n} — service provider of type (${t}).`,
    license: 'Licence number', cr: 'Commercial register', city: 'City', email: 'Email', phone: 'Mobile',
    agreement: 'Agreement text', omitted: (list: string[]) => `Annexes of the agreement that do not apply to this provider type and are not printed: ${list.join('; ')}.`,
    signing: 'Acceptance and signature',
    accepted: (v: string, when: string) => `Accepted the agreement (version ${v}) on: ${when}`,
    net: (ip: string, dev: string, pl: string) => `Network address (IP): ${ip} · Device: ${dev} · Platform: ${pl}`,
    agent: (ua: string) => `Browser/app: ${ua}`,
    signer: (n: string, r: string) => `Signatory: ${n}${r ? ` (${r})` : ''}`, holder: (n: string) => `Account holder: ${n}`,
    signedAt: (when: string) => `Date and time of signing: ${when}`,
  },
} as const;

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
   * Builds the PDF in one language. Returns the full SHA-256 of the FINAL bytes (the hash cannot be printed in the document it hashes;
   * it is stored with the row and shown beside it). The text is the agreement of the accepted version in that language, cut to the
   * annexes of the provider's type (`agreementForType`); a language with no text is refused, not filled in.
   */
  async generate(party: ContractParty, agreement: ContractAgreement, signature: ContractSignature, meta: ContractMeta, lang: ContractLang = 'ar'): Promise<{ pdf: Buffer; sha256: string }> {
    const T = LABELS[lang];
    const content = lang === 'en' ? agreement.policy.content_en : agreement.policy.content_ar;
    if (!String(content || '').trim()) throw typed(HttpStatus.CONFLICT, 'provider_agreement_language_unavailable', { language: lang });
    const forType = agreementForType(content, party.providerType);
    const Doc: any = (PDFDocument as any).default || PDFDocument;
    const doc = new Doc({
      size: 'A4', margin: 50, bufferPages: true,
      info: { Title: lang === 'en' ? 'Nabd Provider Partnership Agreement' : 'عقد شراكة مزود خدمة — نبض', Subject: `contract ${meta.contractId} v${meta.versionNo}; agreement ${agreement.policy.version}; ${lang}` },
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
      for (const line of chunkParagraph(text).flatMap((part) => wrapBidi(pdfDoc, part, W, { fonts: f, size }))) {
        room(size * 1.55);
        drawBidi(pdfDoc, line, X, y, W, { fonts: f, size });
        y += size * 1.55;
      }
      y += o.gap ?? 0;
    };
    const rule = () => { room(12); doc.moveTo(X, y).lineTo(X + W, y).strokeColor(teal).lineWidth(1.2).stroke(); y += 10; };
    const name = (lang === 'en' ? party.nameEn || party.nameAr : party.nameAr || party.nameEn) || '—';
    const policyTitle = (lang === 'en' ? agreement.policy.title_en : agreement.policy.title_ar) || agreement.policy.key;

    // ── Header ──
    para(T.title, { size: 18, bold: true, color: teal, gap: 2 });
    para(T.number(meta.contractId, meta.versionNo), { size: 9, color: muted });
    para(T.text(policyTitle, agreement.policy.version), { size: 9, color: muted, gap: 4 });
    rule();

    // ── Parties ──
    para(T.parties, { size: 13, bold: true, gap: 2 });
    para(T.first);
    para(T.second(name, party.providerType));
    if (party.licenseNumber) para(`${T.license}: ${party.licenseNumber}`);
    if (party.crNumber) para(`${T.cr}: ${party.crNumber}`);
    if (party.city) para(`${T.city}: ${party.city}`);
    if (party.email) para(`${T.email}: ${party.email}`);
    if (party.phone) para(`${T.phone}: ${party.phone}`);
    y += 6; rule();

    // ── The text the provider read and accepted: the body and the annexes of this provider's type ──
    para(T.agreement, { size: 13, bold: true, gap: 2 });
    for (const raw of forType.lines) {
      if (!raw.trim()) { y += 5; continue; }
      const { text, heading } = policyLine(raw);
      para(text, { size: heading ? 12 : 10.5, bold: heading, gap: heading ? 2 : 1.5 });
    }
    if (forType.omitted.length) para(T.omitted(forType.omitted), { size: 9, color: muted, gap: 2 });
    y += 6; rule();

    // ── Acceptance and signature ──
    room(190);
    para(T.signing, { size: 13, bold: true, gap: 2 });
    const a = agreement.acceptance;
    para(T.accepted(a.version, when(a.accepted_at)), { size: 10 });
    para(T.net(a.ip || '—', a.device || '—', a.platform || '—'), { size: 9, color: muted });
    if (a.user_agent) para(T.agent(a.user_agent), { size: 8, color: muted });
    para(T.signer(party.signerName || '—', party.signerRole || ''), { size: 10.5, bold: true });
    if (party.accountName) para(T.holder(party.accountName), { size: 9, color: muted });
    para(T.signedAt(when(meta.signedAt)), { size: 10.5, bold: true, gap: 4 });
    room(80);
    try {
      doc.image(signature.bytes, lang === 'en' ? X : X + W - 150, y, { fit: [140, 64] });
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
      drawBidi(pdfDoc, `${meta.contractId} · v${meta.versionNo} · ${agreement.policy.key} ${agreement.policy.version} · ${lang} · ${i + 1}/${range.count}`, X, doc.page.height - 38, W, { fonts: fonts.reg, size: 8, align: 'left', base: 'ltr' });
    }

    doc.end();
    const pdf = await done;
    return { pdf, sha256: createHash('sha256').update(pdf).digest('hex') };
  }
}
