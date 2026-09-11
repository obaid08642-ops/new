import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

/**
 * Signed provider contract PDF.
 * Generated at onboarding submit: two-party agreement (Nabd platform + provider)
 * with the drawn e-signature merged into the provider signature area.
 * Stored base64 in `provider_contracts`; visible to admin always, to the provider
 * only when an admin grants visibility.
 */

// ── RTL helper ──────────────────────────────────────────────────────────────
// fontkit (inside pdfkit) already applies OpenType Arabic glyph shaping, but it
// does NOT perform bidi reordering — RTL word order must be reversed manually.
// We reverse at word level so each Arabic word still shapes correctly.
function ar(line: string): string {
  return line.split(' ').reverse().join(' ');
}

// ── Contract service ─────────────────────────────────────────────────────────
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
}

@Injectable()
export class ContractPdfService {
  private logger = new Logger('ContractPdf');

  constructor(@InjectConnection() private readonly conn: Connection) {}

  private fontPath(name: string): string | null {
    const candidates = [
      path.join(__dirname, '..', '..', 'assets', 'fonts', name), // dist/assets/fonts (nest assets copy)
      path.join(process.cwd(), 'dist', 'assets', 'fonts', name),
      path.join(process.cwd(), 'src', 'assets', 'fonts', name), // ts-node / tests
    ];
    for (const p of candidates) if (fs.existsSync(p) && this.isValidFont(p)) return p;
    return null;
  }

  /**
   * Guard against corrupt font files (e.g. an HTML error page saved as .ttf —
   * Amiri-Bold.ttf once contained the 14-byte text "404: Not Found", which made
   * fontkit throw "Unknown font format" and silently broke contract generation).
   */
  private isValidFont(p: string): boolean {
    try {
      const stat = fs.statSync(p);
      if (stat.size < 1024) return false; // real TTF/OTF fonts are far larger
      const fd = fs.openSync(p, 'r');
      const head = Buffer.alloc(4);
      fs.readSync(fd, head, 0, 4, 0);
      fs.closeSync(fd);
      const sig = head.toString('latin1');
      return head.readUInt32BE(0) === 0x00010000 || sig === 'OTTO' || sig === 'true' || sig === 'ttcf';
    } catch {
      return false;
    }
  }

  private async loadSignature(url?: string): Promise<Buffer | null> {
    if (!url) return null;
    try {
      if (url.startsWith('data:')) {
        const base64 = url.slice(url.indexOf(',') + 1);
        return Buffer.from(base64, 'base64');
      }
      // Storage object ID (the app uploads the drawn signature to /storage and
      // sends back the object id) → resolve to bytes or a fetchable URL.
      if (!/^https?:\/\//.test(url)) {
        const obj: any = await this.conn.collection('storage_objects').findOne({ id: url, deleted: { $ne: true } } as any);
        if (!obj) return null;
        if (obj.data_base64) return Buffer.from(obj.data_base64, 'base64');
        if (obj.backend === 'cloudinary' && obj.external_key) {
          // Private Cloudinary assets need a signed delivery URL
          const cloudinary = require('cloudinary').v2;
          cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
          });
          const signed = obj.visibility === 'public_read'
            ? obj.external_url
            : cloudinary.url(obj.external_key, { sign_url: true, secure: true, type: 'authenticated' });
          const res = await fetch(signed);
          if (!res.ok) return null;
          return Buffer.from(await res.arrayBuffer());
        }
        if (obj.external_url) {
          const res = await fetch(obj.external_url);
          if (!res.ok) return null;
          return Buffer.from(await res.arrayBuffer());
        }
        return null;
      }
      const res = await fetch(url);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch (e: any) {
      this.logger.warn(`signature fetch failed: ${e.message}`);
    }
    return null;
  }

  async generate(party: ContractParty): Promise<{ pdf: Buffer; sha256: string }> {
    const sig = await this.loadSignature(party.signatureUrl);
    const Doc: any = (PDFDocument as any).default || PDFDocument;
    const doc = new Doc({ size: 'A4', margin: 50, info: { Title: 'Nabd Provider Partnership Agreement' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const fontRegular = this.fontPath('Amiri-Regular.ttf') || this.fontPath('NotoNaskhArabic-Regular.ttf');
    const fontBold = this.fontPath('Amiri-Bold.ttf') || this.fontPath('NotoNaskhArabic-Bold.ttf');
    if (fontRegular) doc.registerFont('ar', fontRegular);
    if (fontBold) doc.registerFont('ar-b', fontBold);
    const F = fontRegular ? 'ar' : 'Helvetica';
    const FB = fontBold ? 'ar-b' : 'Helvetica-Bold';

    const right = (txt: string, opts: any = {}) => doc.text(txt, { align: 'right', ...opts });
    const W = doc.page.width - 100;

    // ── Header ──
    doc.font(FB).fontSize(18).fillColor('#0f766e');
    right(ar('عقد شراكة مزود خدمة') + '  —  ' + ar('منصة نبض'));
    doc.font(FB).fontSize(12).fillColor('#111');
    doc.text('Nabd Platform — Provider Partnership Agreement', { align: 'right' });
    doc.moveDown(0.5);
    doc.font(F).fontSize(9).fillColor('#555');
    right(ar(`رقم العقد: ${party.profileId}`));
    right(ar(`تاريخ الإبرام: ${new Date().toISOString().slice(0, 10)}`));
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).strokeColor('#0f766e').lineWidth(1.5).stroke();
    doc.moveDown(1);

    // ── Parties ──
    doc.font(FB).fontSize(13).fillColor('#111');
    right(ar('أطراف الاتفاق'));
    doc.moveDown(0.4);
    doc.font(F).fontSize(11);
    right(ar('الطرف الأول: منصة نبض الصحية (المشغّل المرخص للمنصة).'));
    right(ar(`الطرف الثاني: ${party.nameAr || party.nameEn || '—'} — مزود خدمة من فئة (${party.providerType}).`));
    if (party.licenseNumber) right(ar(`رقم الترخيص: ${party.licenseNumber}`));
    if (party.crNumber) right(ar(`السجل التجاري: ${party.crNumber}`));
    if (party.city) right(ar(`المدينة: ${party.city}`));
    if (party.email) right(ar(`البريد الإلكتروني: ${party.email}`));
    if (party.phone) right(ar(`الجوال: ${party.phone}`));
    doc.moveDown(1);

    // ── Terms ──
    doc.font(FB).fontSize(13);
    right(ar('البنود الأساسية'));
    doc.moveDown(0.4);
    doc.font(F).fontSize(10.5);
    const terms = [
      'يلتزم الطرف الثاني بصحة جميع البيانات والتراخيص والمستندات المقدمة عبر المنصة، ويتحمل كامل المسؤولية النظامية عن أي بيانات غير صحيحة، ويخلي الطرف الأول مسؤوليته الكاملة عن أي ضرر ينشأ عن بيانات خاطئة.',
      'تخضع العلاقة بين الطرفين لأنظمة المملكة العربية السعودية (بما فيها نظام مزاولة المهن الصحية، ونظام المؤسسات الصحية الخاصة، ونظام مكافحة الغش التجاري)، ويلتزم المزود بضوابط وزارة الصحة وهيئة التخصصات الصحية والهيئة العامة للغذاء والدواء حسب فئته.',
      'تُعرض خدمات المزود على المنصة بعد اعتماد الإدارة، ويحق للإدارة إيقاف الحساب فوراً عند مخالفة الشروط أو ورود بلاغات تمس سلامة المرضى، دون الإخلال بحقوق الطرف الأول في المطالبة بالتعويض.',
      'تُسوّى المستحقات المالية وفق سياسة المحفظة والعمولة المعتمدة داخل المنصة (بعد خصم العمولة المتفق عليها والضرائب المستحقة)، وتُحوّل إلى الحساب البنكي الموثق لدى المزود خلال المدة المعتمدة، ولا تتحمل المنصة أي التزام بدفع مبالغ لم تُستكمل خدمتها فعلياً.',
      'يلتزم الطرفان بالسرية التامة لبيانات المرضى وفق نظام حماية البيانات الشخصية (PDPL) ولائحته التنفيذية، ويُحظر على الطرف الثاني استخدام بيانات المرضى لأي غرض تسويقي أو مشاركتها مع الغير دون موافقة صريحة ومسبقة، ويتحمل الطرف الثاني كامل الجزاءات النظامية المترتبة على أي تسريب.',
      'يقر الطرف الثاني بأن المنصة وسيط تقني فقط وليست مقدم خدمة طبية، وأن المسؤولية الطبية الكاملة (التشخيص، الوصفة، الجرعة، المتابعة) تقع على المزود وممارسيه المرخصين، وتخلي المنصة مسؤوليتها من أي خطأ طبي أو مضاعفات علاجية.',
      'يلتزم الطرف الثاني بمستوى الخدمة المتفق عليه (SLA): الاستجابة للطلبات خلال المدد المعتمدة في المنصة، وفي حال التجاوز المتكرر يحق للإدارة تخفيض أولوية ظهوره أو إيقاف حسابه مؤقتاً.',
      'يلتزم المزود بعدم التعامل المباشر مع مرضى المنصة خارجها لغرض الالتفاف على العمولة، ويعد ذلك إخلالاً جوهرياً يجيز فسخ العقد فوراً والمطالبة بالتعويض.',
      'فسخ العقد: يجوز لأي طرف فسخ العقد بإشعار كتابي قبل (30) يوماً، ويستمر الطرف الثاني في تنفيذ الطلبات الجارية حتى إتمامها، وتستحق المستحقات عن الخدمات المنجزة فعلاً فقط.',
      'تسوية النزاعات: تخضع لأحكام الأنظمة السعودية، ويتم حلها ودياً أولاً، وعند التعذر تُحال إلى المحكمة المختصة في مدينة الرياض، وتكون اللغة العربية هي المعتمدة في تفسير العقد.',
      'التعديلات: يحق للطرف الأول تحديث بنود العقد عند تغير الأنظمة أو السياسات، على أن يُشعر الطرف الثاني قبل (15) يوماً، ويعد الاستمرار في تقديم الخدمات قبولاً ضمنياً بالتعديل.',
      'يُعد التوقيع الإلكتروني المدرج في هذا العقد موافقة نهائية وملزمة من الطرف الثاني على جميع البنود أعلاه، ويحتفظ الطرف الأول ببصمة التحقق (SHA-256) كدليل سلامة على المستند.',
    ];
    terms.forEach((t, i) => { right(ar(`${i + 1}. ${t}`)); doc.moveDown(0.35); });
    doc.moveDown(0.8);

    // ── Signature area (two parties) ──
    doc.font(FB).fontSize(13).fillColor('#111');
    right(ar('التوقيع والإقرار'));
    doc.moveDown(0.6);
    const topY = doc.y;
    const colW = W / 2 - 10;
    // Party 2 (provider) — right column
    doc.font(FB).fontSize(11);
    doc.text(ar('توقيع الطرف الثاني (المزود)'), 50 + W - colW, topY, { width: colW, align: 'right' });
    doc.font(F).fontSize(10).fillColor('#333');
    doc.text(ar(`الاسم: ${party.signerName || '—'} (${party.signerRole || 'مفوّض'})`), 50 + W - colW, topY + 22, { width: colW, align: 'right' });
    if (sig) {
      doc.image(sig, 50 + W - colW / 2 - 60, topY + 42, { fit: [120, 60] });
    } else {
      doc.font(F).fontSize(10).fillColor('#b91c1c');
      doc.text(ar('(لم يُرفق توقيع إلكتروني)'), 50 + W - colW, topY + 46, { width: colW, align: 'right' });
    }
    // Party 1 (platform) — left column
    doc.font(FB).fontSize(11).fillColor('#111');
    doc.text(ar('توقيع الطرف الأول (المنصة)'), 50, topY, { width: colW, align: 'right' });
    doc.font(F).fontSize(10).fillColor('#333');
    doc.text(ar('منصة نبض الصحية — الإدارة القانونية'), 50, topY + 22, { width: colW, align: 'right' });
    doc.font(F).fontSize(9).fillColor('#0f766e');
    doc.text('NABD PLATFORM — DIGITALLY EXECUTED', 50, topY + 46, { width: colW, align: 'right' });
    doc.moveDown(6);

    // ── Footer / integrity ──
    doc.y = Math.max(doc.y, topY + 120);
    const preliminary = Buffer.concat(chunks);
    const sha = createHash('sha256').update(preliminary).update(party.profileId).digest('hex').slice(0, 24);
    doc.font(F).fontSize(8).fillColor('#777');
    right(ar(`بصمة التحقق من سلامة المستند: ${sha}`));
    right(ar('هذا المستند محفوظ لدى منصة نبض ولا يُتاح إلا للإدارة المخولة، ويمكن إتاحته للمزود بقرار إداري.'));

    doc.end();
    const pdf = await done;
    return { pdf, sha256: sha };
  }
}
