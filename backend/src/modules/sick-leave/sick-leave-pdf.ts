import * as fs from 'fs';
import * as path from 'path';
import * as PDFDocument from 'pdfkit';
import { drawBidi, wrapBidi, hasArabic } from '../../common/pdf-bidi';

/**
 * The PDF of a sick-leave certificate (owner decision PT-08), drawn like the invoice's (billing/invoice-pdf.ts): Arabic shaped from the embedded Naskh font and
 * laid out right to left, English beside it. It carries the platform name and logo, the serial, the issue time, the doctor (name, specialty, licence), the
 * patient (name and ID number, in full: this is the patient's own copy), the consultation (date and booking reference), the leave (from, to, days), the
 * reason in the doctor's wording (the diagnosis only if the doctor chose to show it), the doctor's electronic signature block, and a QR code with the short
 * code that opens the public verify page. A revoked certificate says so across its face. It says what it is: issued through the platform by a licensed
 * provider; it is NOT a government document and is not labelled as one.
 */
const X = 40;
const W = 515;
const INK = '#0B1B2B';
const MUTED = '#5B6877';
const LINE = '#D9DEE5';
const ACCENT = '#D42A38';

function assetPath(...parts: string[]): string | null {
  const candidates = [
    path.join(__dirname, '..', '..', 'assets', ...parts),
    path.join(process.cwd(), 'dist', 'assets', ...parts),
    path.join(process.cwd(), 'src', 'assets', ...parts),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

const L = {
  platform: { ar: 'نبض بلس', en: 'Nabd Plus' },
  title: { ar: 'شهادة إجازة مرضية', en: 'Sick leave certificate' },
  serial: { ar: 'الرقم التسلسلي', en: 'Certificate no.' },
  issuedAt: { ar: 'تاريخ ووقت الإصدار', en: 'Issued on' },
  doctor: { ar: 'الطبيب المعالج', en: 'Treating doctor' },
  specialty: { ar: 'التخصص', en: 'Specialty' },
  licence: { ar: 'رقم الترخيص', en: 'Licence no.' },
  patient: { ar: 'المريض', en: 'Patient' },
  nationalId: { ar: 'رقم الهوية / الإقامة', en: 'ID / iqama no.' },
  consultation: { ar: 'تاريخ الاستشارة', en: 'Consultation date' },
  booking: { ar: 'رقم الحجز', en: 'Booking ref.' },
  leave: { ar: 'مدة الإجازة', en: 'Leave period' },
  from: { ar: 'من', en: 'From' },
  to: { ar: 'إلى', en: 'To' },
  days: { ar: 'عدد الأيام', en: 'Number of days' },
  reason: { ar: 'السبب', en: 'Reason' },
  diagnosis: { ar: 'التشخيص', en: 'Diagnosis' },
  signature: { ar: 'التوقيع الإلكتروني للطبيب', en: "Doctor's electronic signature" },
  verify: { ar: 'للتحقق من صحة الشهادة امسح الرمز أو أدخل الرمز المختصر', en: 'To verify this certificate scan the code or enter the short code' },
  code: { ar: 'الرمز المختصر', en: 'Short code' },
  note: { ar: 'صدرت هذه الشهادة عبر المنصة من مقدّم خدمة مرخّص، وليست وثيقة حكومية.', en: 'Issued through the platform by a licensed provider. This is not a government document.' },
  revoked: { ar: 'ملغاة', en: 'REVOKED' },
  revokedOn: { ar: 'ألغيت بتاريخ', en: 'Revoked on' },
  revokeReason: { ar: 'سبب الإلغاء', en: 'Reason for revoking' },
  none: { ar: 'غير متوفر', en: 'not available' },
};

const dateOf = (v: unknown) => (v ? new Date(v as any).toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }) : '');
const dateTimeOf = (v: unknown) => (v ? `${new Date(v as any).toLocaleString('en-CA', { timeZone: 'Asia/Riyadh', hour12: false }).replace(',', '')} (UTC+3)` : '');

export interface SickLeavePdfInput { cert: any; qrPng: Buffer | null; verifyUrl: string }

export function renderSickLeavePdf({ cert, qrPng, verifyUrl }: SickLeavePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const Doc: any = (PDFDocument as any).default ?? PDFDocument;
    const doc = new Doc({ size: 'A4', margin: X, info: { Title: `Sick leave certificate ${cert.serial ?? ''}`.trim(), Author: 'Nabd Plus' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const arReg = assetPath('fonts', 'NotoNaskhArabic-Regular.ttf');
    const arBold = assetPath('fonts', 'NotoNaskhArabic-Bold.ttf');
    if (arReg) doc.registerFont('ar', arReg);
    if (arBold) doc.registerFont('ar-b', arBold);
    const reg = { ar: arReg ? 'ar' : 'Helvetica', latin: 'Helvetica' };
    const bold = { ar: arBold ? 'ar-b' : arReg ? 'ar' : 'Helvetica-Bold', latin: 'Helvetica-Bold' };
    doc.font(reg.latin);

    let y = 40;
    const text = (s: string, x: number, w: number, o: { size?: number; bold?: boolean; color?: string; align?: 'left' | 'right' | 'center'; base?: 'ltr' } = {}) => {
      doc.fillColor(o.color ?? INK);
      return drawBidi(doc, s, x, y, w, { fonts: o.bold ? bold : reg, size: o.size ?? 10, align: o.align, ...(o.base ? { base: o.base } : {}) } as any);
    };

    // header: the Noon Dot icon, the platform name and the title
    const logo = assetPath('brand', 'nabd-icon.png');
    if (logo) { try { doc.image(logo, X, y, { fit: [54, 54] }); } catch { /* a bad logo never blocks a certificate */ } }
    text(`${L.platform.ar}`, X + 140, W - 140, { size: 12, bold: true, align: 'right' });
    y += 20; text(L.title.ar, X + 140, W - 140, { size: 20, bold: true, align: 'right', color: ACCENT });
    y += 34; text(L.title.en, X + 140, W - 140, { size: 11, bold: true, align: 'right' });
    y = 108;
    doc.moveTo(X, y).lineTo(X + W, y).strokeColor(LINE).lineWidth(0.6).stroke();
    y += 10;

    const row = (label: { ar: string; en: string }, value: unknown, o: { bold?: boolean; ltr?: boolean } = {}) => {
      const shown = value === null || value === undefined || value === '' ? `${L.none.ar} / ${L.none.en}` : String(value);
      const valueW = 200; const valueX = X + (W - valueW) / 2;
      const lines = wrapBidi(doc, shown, valueW, { fonts: o.bold ? bold : reg, size: 10 });
      const lh = (l: string) => (hasArabic(l) ? 16 : 13);
      const total = Math.max(lines.reduce((a, l) => a + lh(l), 0), 16);
      text(label.en, X, 150, { size: 9, color: MUTED });
      text(label.ar, X + W - 150, 150, { size: 10, color: MUTED, align: 'right' });
      let ly = y;
      for (const l of lines) { drawBidi(doc, l, valueX, ly, valueW, { fonts: o.bold ? bold : reg, size: 10, align: 'center', ...(o.ltr ? { base: 'ltr' } : {}) } as any); ly += lh(l); }
      y += total + 2;
    };

    row(L.serial, cert.serial, { bold: true, ltr: true });
    row(L.issuedAt, dateTimeOf(cert.issued_at), { ltr: true });
    y += 4;
    row(L.doctor, cert.doctor_name);
    row(L.specialty, [cert.doctor_specialty_ar, cert.doctor_specialty_en].filter(Boolean).join(' / ') || null);
    row(L.licence, cert.doctor_license_no, { ltr: true });
    y += 4;
    row(L.patient, cert.patient_name);
    row(L.nationalId, cert.national_id, { ltr: true });
    y += 4;
    row(L.consultation, dateTimeOf(cert.consultation_at), { ltr: true });
    row(L.booking, cert.booking_ref, { ltr: true });
    y += 4;
    row(L.from, dateOf(cert.from), { bold: true, ltr: true });
    row(L.to, dateOf(cert.to), { bold: true, ltr: true });
    row(L.days, cert.days, { bold: true, ltr: true });
    if (cert.reason) row(L.reason, cert.reason);
    if (cert.show_diagnosis && cert.diagnosis) row(L.diagnosis, cert.diagnosis);

    // the doctor's electronic signature block
    y += 10;
    doc.rect(X, y, 250, 64).strokeColor(LINE).lineWidth(0.8).stroke();
    const by = y;
    y = by + 6; text(`${L.signature.ar} / ${L.signature.en}`, X + 8, 234, { size: 8, color: MUTED });
    y = by + 22; text(String(cert.doctor_name ?? ''), X + 8, 234, { size: 11, bold: true });
    y = by + 42; text(`${cert.doctor_license_no ?? ''}  ·  ${dateTimeOf(cert.issued_at)}`, X + 8, 234, { size: 8, color: MUTED, base: 'ltr' });

    // the QR and the short code
    if (qrPng) { try { doc.image(qrPng, X + W - 110, by - 4, { fit: [100, 100] }); } catch { /* the short code below still works */ } }
    y = by + 100;
    text(`${L.code.ar} / ${L.code.en}:  ${cert.verify_code ?? ''}`, X + 250, W - 250, { size: 11, bold: true, align: 'right', base: 'ltr' });
    y += 18;
    text(`${L.verify.ar}`, X, W, { size: 8, color: MUTED, align: 'right' });
    y += 14;
    text(`${L.verify.en}: ${verifyUrl}`, X, W, { size: 7.5, color: MUTED, align: 'left', base: 'ltr' });

    y += 28;
    text(L.note.ar, X, W, { size: 8, color: MUTED, align: 'right' });
    y += 13;
    text(L.note.en, X, W, { size: 7.5, color: MUTED, align: 'left', base: 'ltr' });

    // revoked: said across the face of the page
    if (cert.status === 'revoked') {
      doc.save();
      doc.rotate(-25, { origin: [300, 420] });
      doc.fillColor(ACCENT).opacity(0.18);
      drawBidi(doc, `${L.revoked.ar} ${L.revoked.en}`, 60, 380, 480, { fonts: bold, size: 64, align: 'center' } as any);
      doc.restore();
      doc.opacity(1);
      y += 20;
      text(`${L.revokedOn.ar} / ${L.revokedOn.en}: ${dateTimeOf(cert.revoked_at)}`, X, W, { size: 9, bold: true, color: ACCENT, align: 'right' });
      if (cert.revoke_reason) { y += 14; text(`${L.revokeReason.ar}: ${cert.revoke_reason}`, X, W, { size: 9, color: ACCENT, align: 'right' }); }
    }
    doc.end();
  });
}
