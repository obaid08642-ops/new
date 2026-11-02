import * as fs from 'fs';
import * as path from 'path';
import * as PDFDocument from 'pdfkit';
import { drawBidi, measureBidi, wrapBidi, hasArabic } from '../../common/pdf-bidi';

/**
 * The PDF of an invoice, a credit note or (while the platform is not VAT-registered) a payment receipt: a simplified tax invoice in Arabic and English (Arabic on the right, English on the left of
 * every line), drawn from the presented document (`BillingService.present`), so it shows exactly what the API returns.
 * Arabic is shaped by fontkit (inside pdfkit) from an embedded Naskh font and laid out right to left; lines that mix Arabic with
 * numbers or English go through `common/pdf-bidi.ts`. Nothing here is invented: an empty seller or provider field is printed as
 * "not configured" / "not available".
 */

const W = 515; // content width on A4 with 40 pt margins
const X = 40;
const INK = '#0B1B2B';
const MUTED = '#5B6877';
const LINE = '#D9DEE5';
const ACCENT = '#D42A38'; // the action colour of the identity
const WARN = '#B45309';

const T = {
  title: { ar: 'فاتورة ضريبية مبسطة', en: 'Simplified tax invoice' },
  creditTitle: { ar: 'إشعار دائن', en: 'Credit note' },
  issuer: { ar: 'الجهة المصدرة للفاتورة', en: 'Issued by' },
  legalName: { ar: 'الاسم النظامي', en: 'Legal name' },
  vat: { ar: 'الرقم الضريبي', en: 'VAT number' },
  cr: { ar: 'السجل التجاري', en: 'Commercial registration (CR)' },
  address: { ar: 'العنوان', en: 'Address' },
  notConfigured: { ar: 'غير مُعدّ بعد', en: 'not configured' },
  notAvailable: { ar: 'غير متوفر', en: 'not available' },
  details: { ar: 'بيانات الفاتورة', en: 'Invoice details' },
  invoiceNo: { ar: 'رقم الفاتورة', en: 'Invoice no.' },
  creditNo: { ar: 'رقم الإشعار', en: 'Credit note no.' },
  reverses: { ar: 'يعكس الفاتورة', en: 'Reverses invoice' },
  issuedAt: { ar: 'تاريخ ووقت الإصدار', en: 'Issue date and time' },
  booking: { ar: 'رقم الحجز / الطلب', en: 'Booking / order no.' },
  patient: { ar: 'العميل', en: 'Customer' },
  provider: { ar: 'مقدّم الخدمة (بائع الخدمة)', en: 'Service provider (seller of the service)' },
  providerNote: { ar: 'مقدّم الخدمة هو بائعها؛ تصدر الشركة أعلاه هذه الفاتورة بصفتها طرفاً ثالثاً', en: 'The provider is the seller of the service; the company above issues this invoice as a third party' },
  vatOnDelivery: { ar: 'ضريبة القيمة المضافة على رسوم التوصيل', en: 'VAT on the delivery fee' },
  paymentSection: { ar: 'الدفع', en: 'Payment' },
  providerName: { ar: 'الاسم', en: 'Name' },
  providerType: { ar: 'النوع', en: 'Type' },
  licence: { ar: 'رقم الترخيص', en: 'Licence no.' },
  items: { ar: 'البنود', en: 'Items' },
  item: { ar: 'البند', en: 'Item' },
  qty: { ar: 'الكمية', en: 'Qty' },
  unit: { ar: 'سعر الوحدة', en: 'Unit price' },
  amount: { ar: 'المبلغ', en: 'Amount' },
  discount: { ar: 'الخصم', en: 'Discount' },
  subtotal: { ar: 'المجموع قبل الضريبة', en: 'Subtotal (excl. VAT)' },
  vatLine: { ar: 'ضريبة القيمة المضافة', en: 'VAT' },
  total: { ar: 'الإجمالي شامل الضريبة', en: 'Total (incl. VAT)' },
  payment: { ar: 'طريقة الدفع', en: 'Payment method' },
  insurance: { ar: 'التأمين', en: 'Insurance' },
  insurer: { ar: 'شركة التأمين', en: 'Insurer' },
  insurerShare: { ar: 'حصة شركة التأمين', en: 'Insurer share' },
  patientShare: { ar: 'حصة المريض', en: 'Patient share' },
  servicePrice: { ar: 'سعر الخدمة', en: 'Service price' },
  status: { ar: 'الحالة', en: 'Status' },
  paid: { ar: 'مدفوعة', en: 'Paid' },
  refunded: { ar: 'مستردة بالكامل', en: 'Refunded' },
  partlyRefunded: { ar: 'مستردة جزئياً', en: 'Partly refunded' },
  creditNotes: { ar: 'إشعارات دائنة', en: 'Credit notes' },
  qr: { ar: 'رمز الاستجابة السريعة (هيئة الزكاة والضريبة والجمارك)', en: 'ZATCA QR code' },
  qrPending: { ar: 'يُضاف رمز QR بعد إعداد بيانات البائع', en: 'The QR code is added once the seller details are configured' },
  // receipt mode: the platform is not VAT-registered, so these documents are not tax invoices and carry no VAT line or QR
  receiptTitle: { ar: 'إيصال دفع', en: 'Payment receipt' },
  refundReceiptTitle: { ar: 'إيصال استرداد', en: 'Refund receipt' },
  receiptIssuer: { ar: 'الجهة المصدرة للإيصال', en: 'Issued by' },
  receiptDetails: { ar: 'بيانات الإيصال', en: 'Receipt details' },
  receiptNo: { ar: 'رقم الإيصال', en: 'Receipt no.' },
  refundReceiptNo: { ar: 'رقم إيصال الاسترداد', en: 'Refund receipt no.' },
  reversesReceipt: { ar: 'يخص الإيصال', en: 'Refers to receipt' },
  refundReceipts: { ar: 'إيصالات الاسترداد', en: 'Refund receipts' },
  totalPaid: { ar: 'المبلغ المدفوع', en: 'Total paid' },
  totalRefunded: { ar: 'المبلغ المسترد', en: 'Amount refunded' },
  providerNoteReceipt: { ar: 'مقدّم الخدمة هو بائعها؛ تصدر الشركة أعلاه هذا الإيصال بصفتها طرفاً ثالثاً', en: 'The provider is the seller of the service; the company above issues this receipt as a third party' },
  electronicReceipt: { ar: 'صدر هذا الإيصال إلكترونياً ولا يحتاج إلى توقيع', en: 'Electronically generated; no signature required' },
  support: { ar: 'الدعم', en: 'Support' },
  refundPolicy: { ar: 'سياسة الاسترداد', en: 'Refund policy' },
  electronic: { ar: 'صدرت هذه الفاتورة إلكترونياً ولا تحتاج إلى توقيع', en: 'Electronically generated; no signature required' },
};

const LINE_LABELS: Record<string, { ar: string; en: string }> = {
  consultation_fee: { ar: 'استشارة طبية', en: 'Consultation' },
  service: { ar: 'خدمة', en: 'Service' },
  platform_fee: { ar: 'رسوم المنصة', en: 'Platform fee' },
  home_visit_fee: { ar: 'رسوم الزيارة المنزلية', en: 'Home visit fee' },
  transport_fee: { ar: 'رسوم النقل', en: 'Transport fee' },
  delivery_fee: { ar: 'رسوم التوصيل', en: 'Delivery fee' },
  visits: { ar: 'زيارات تمريض منزلي', en: 'Home nursing visits' },
  adjustment: { ar: 'تسوية', en: 'Adjustment' },
  refund: { ar: 'استرداد', en: 'Refund' },
  item: { ar: 'بند', en: 'Item' },
};
const METHOD: Record<string, { ar: string; en: string }> = {
  card: { ar: 'بطاقة', en: 'Card' },
  cash: { ar: 'نقداً', en: 'Cash' },
  insurance: { ar: 'تأمين', en: 'Insurance' },
  'apple-pay': { ar: 'أبل باي', en: 'Apple Pay' },
  'google-pay': { ar: 'جوجل باي', en: 'Google Pay' },
};
const PROVIDER_TYPE: Record<string, { ar: string; en: string }> = {
  doctor: { ar: 'طبيب', en: 'Doctor' },
  clinic: { ar: 'عيادة', en: 'Clinic' },
  hospital: { ar: 'مستشفى', en: 'Hospital' },
  pharmacy: { ar: 'صيدلية', en: 'Pharmacy' },
  lab: { ar: 'مختبر', en: 'Laboratory' },
  radiology: { ar: 'مركز أشعة', en: 'Radiology centre' },
  nursing: { ar: 'تمريض منزلي', en: 'Home nursing' },
  home_care: { ar: 'رعاية منزلية', en: 'Home care' },
};

function assetPath(...parts: string[]): string | null {
  const candidates = [
    path.join(__dirname, '..', '..', 'assets', ...parts), // dist/assets (nest assets copy) and src/assets under ts-jest
    path.join(process.cwd(), 'dist', 'assets', ...parts),
    path.join(process.cwd(), 'src', 'assets', ...parts),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

const money = (v: unknown) => Number(v).toFixed(2);
const sar = (v: unknown) => `${money(v)} SAR`;

export interface InvoicePdfInput {
  /** The presented document (`BillingService.present`). */
  inv: any;
  /** PNG of the QR, drawn from `inv.qr.payload`; null when there is no QR. */
  qrPng: Buffer | null;
}

export function renderInvoicePdf({ inv, qrPng }: InvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const Doc: any = (PDFDocument as any).default ?? PDFDocument; // the namespace import is the class in the build, an object with `default` under ts-jest
    const credit = inv.type === 'credit_note';
    // one switch: a document issued without a VAT number is a payment receipt (no VAT, no QR); see common/tax-registration.ts
    const receipt = inv.document_kind === 'receipt';
    const doc = new Doc({ size: 'A4', margin: X, bufferPages: true, info: { Title: receipt ? `${credit ? 'Refund receipt' : 'Payment receipt'} ${inv.invoice_no}` : credit ? `Credit note ${inv.invoice_no}` : `Invoice ${inv.invoice_no}`, Producer: 'Nabd+' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Fonts: Naskh for Arabic (it has no Latin letters, brackets or hyphen), the standard Helvetica for everything else.
    const arReg = assetPath('fonts', 'NotoNaskhArabic-Regular.ttf');
    const arBold = assetPath('fonts', 'NotoNaskhArabic-Bold.ttf');
    if (arReg) doc.registerFont('ar', arReg);
    if (arBold) doc.registerFont('ar-b', arBold);
    const reg = { ar: arReg ? 'ar' : 'Helvetica', latin: 'Helvetica' };
    const bold = { ar: arBold ? 'ar-b' : arReg ? 'ar' : 'Helvetica-Bold', latin: 'Helvetica-Bold' };
    doc.font(reg.latin);

    let y = 40;
    const space = (h: number) => { if (y + h > 776) { doc.addPage(); y = 40; } };
    const text = (s: string, x: number, w: number, o: { size?: number; bold?: boolean; color?: string; align?: 'left' | 'right' | 'center' } = {}) => {
      doc.fillColor(o.color ?? INK);
      return drawBidi(doc, s, x, y, w, { fonts: o.bold ? bold : reg, size: o.size ?? 10, align: o.align });
    };
    const lineHeight = (size: number) => size * 1.3;
    const rule = (color = LINE) => { doc.moveTo(X, y).lineTo(X + W, y).strokeColor(color).lineWidth(0.6).stroke(); };

    // One bilingual row: English label on the left, Arabic label on the right, the value between them (wrapped). A line with Arabic
    // needs more height than a Latin one (Naskh has tall marks above and below the line).
    const row = (label: { ar: string; en: string }, value: string | null, o: { bold?: boolean; color?: string; size?: number; muted?: boolean } = {}) => {
      const size = o.size ?? 10;
      const valueW = 190;
      const valueX = X + (W - valueW) / 2;
      const shown = value ?? '';
      const parts = shown ? shown.split('\n') : [''];
      const lines = parts.flatMap((p) => (p ? wrapBidi(doc, p, valueW, { fonts: o.bold ? bold : reg, size }) : ['']));
      const heights = lines.map((l) => (hasArabic(l) ? size * 1.6 : size * 1.28));
      const labelH = Math.max(hasArabic(label.ar) ? size * 1.6 : size * 1.28, 0);
      const total = Math.max(labelH, heights.reduce((a, h) => a + h, 0) || labelH);
      space(total);
      text(label.en, X, 150, { size: size - 1, color: MUTED });
      text(label.ar, X + W - 150, 150, { size: size, color: MUTED, align: 'right' });
      let ly = y;
      lines.forEach((l, i) => {
        if (l) drawBidi(doc, l, valueX, ly, valueW, { fonts: o.bold ? bold : reg, size, align: 'center' });
        ly += heights[i];
      });
      y += total;
    };
    const notSet = (v: string | null | undefined, label = T.notConfigured) => (v ? v : `${label.ar} / ${label.en}`);

    const section = (label: { ar: string; en: string }) => {
      space(40);
      y += 4;
      doc.rect(X, y, W, 18).fillColor('#F5F5F7').fill();
      doc.fillColor(INK);
      const sy = y;
      y = sy + 4;
      text(label.en, X + 8, 240, { size: 9, bold: true });
      text(label.ar, X + W - 248, 240, { size: 10.5, bold: true, align: 'right' });
      y = sy + 22;
    };

    // ── Header: logo, title ──
    const logo = assetPath('brand', 'nabd-icon.png');
    if (logo) { try { doc.image(logo, X, y, { fit: [54, 54] }); } catch { /* a bad logo never blocks an invoice */ } }
    const title = receipt ? (credit ? T.refundReceiptTitle : T.receiptTitle) : credit ? T.creditTitle : T.title;
    if (qrPng) { try { doc.image(qrPng, X + 66, y - 2, { fit: [62, 62] }); } catch { /* the QR is also in the API payload */ } }
    drawBidi(doc, title.ar, X + 140, y + 4, W - 140, { fonts: bold, size: 18, align: 'right' });
    doc.fillColor(INK);
    drawBidi(doc, title.en, X + 140, y + 32, W - 140, { fonts: bold, size: 11, align: 'right' });
    y += 64;
    rule(INK);
    y += 2;
    if (!qrPng && !receipt) {
      doc.fillColor(WARN);
      drawBidi(doc, `${T.qrPending.ar} / ${T.qrPending.en}`, X, y + 2, W, { fonts: reg, size: 8, align: 'center' });
      y += 16;
    }

    // ── Issuer: our company, from config ──
    section(receipt ? T.receiptIssuer : T.issuer);
    const s = inv.seller ?? {};
    row(T.legalName, notSet(s.legal_name), { bold: !!s.legal_name, color: s.legal_name ? INK : WARN });
    if (receipt) {
      // no VAT number exists, so none is printed; the CR number and the address only when they have been issued
      if (s.cr_number) row(T.cr, String(s.cr_number));
      if (s.address) row(T.address, String(s.address));
    } else {
      row(T.vat, notSet(s.vat_number), { color: s.vat_number ? INK : WARN });
      row(T.cr, notSet(s.cr_number), { color: s.cr_number ? INK : WARN });
      row(T.address, notSet(s.address), { color: s.address ? INK : WARN });
    }

    // ── Invoice details ──
    section(receipt ? T.receiptDetails : T.details);
    row(receipt ? (credit ? T.refundReceiptNo : T.receiptNo) : credit ? T.creditNo : T.invoiceNo, String(inv.invoice_no), { bold: true });
    if (credit && inv.original_invoice_no) row(receipt ? T.reversesReceipt : T.reverses, String(inv.original_invoice_no));
    row(T.issuedAt, new Date(inv.issued_at || inv.createdAt || Date.now()).toISOString().replace('T', ' ').slice(0, 16) + ' UTC');
    row(T.booking, String(inv.booking_ref || inv.booking_id));
    if (inv.patient_name) row(T.patient, String(inv.patient_name));
    if (!credit) {
      const st = inv.state === 'refunded' ? T.refunded : inv.state === 'partially_refunded' ? T.partlyRefunded : T.paid;
      row(T.status, `${st.ar} / ${st.en}`, { bold: true, color: inv.state === 'paid' ? INK : ACCENT });
      if (Array.isArray(inv.credit_notes) && inv.credit_notes.length) {
        row(receipt ? T.refundReceipts : T.creditNotes, inv.credit_notes.map((n: any) => `${n.invoice_no} (${sar(n.total)})`).join('\n'), { color: ACCENT });
      }
    }

    // ── The service provider: who delivered the service (our company stays the issuer above) ──
    section(T.provider);
    doc.fillColor(MUTED);
    const pNote = receipt ? T.providerNoteReceipt : T.providerNote;
    drawBidi(doc, `${pNote.ar}`, X, y - 2, W, { fonts: reg, size: 8, align: 'right' });
    drawBidi(doc, `${pNote.en}`, X, y + 1, W, { fonts: reg, size: 7, align: 'left', base: 'ltr' });
    y += 14;
    const p = inv.provider;
    if (p) {
      const name = [p.name_ar, p.name_en].filter(Boolean).join('\n') || (p.facility_name ?? '');
      row(T.providerName, name || `${T.notAvailable.ar} / ${T.notAvailable.en}`, { bold: true });
      if (p.facility_name && (p.name_ar || p.name_en)) row({ ar: 'المنشأة', en: 'Facility' }, String(p.facility_name));
      const type = PROVIDER_TYPE[String(p.type)] ?? null;
      row(T.providerType, type ? `${type.ar} / ${type.en}` : `${T.notAvailable.ar} / ${T.notAvailable.en}`);
      row(T.licence, p.license_number ? String(p.license_number) : `${T.notAvailable.ar} / ${T.notAvailable.en}`);
    } else {
      row(T.providerName, `${T.notAvailable.ar} / ${T.notAvailable.en}`);
    }

    // ── Items: the table runs right to left, the item at the right ──
    section(T.items);
    const col = { amount: [X, 85], unit: [X + 85, 85], qty: [X + 170, 50], item: [X + 220, W - 220] } as const;
    const head = (label: { ar: string; en: string }, c: readonly [number, number], align: 'left' | 'right' | 'center') => {
      drawBidi(doc, label.en, c[0], y, c[1], { fonts: reg, size: 8, align });
      drawBidi(doc, label.ar, c[0], y + 10, c[1], { fonts: reg, size: 9, align });
    };
    doc.fillColor(MUTED);
    head(T.amount, col.amount, 'left'); head(T.unit, col.unit, 'left'); head(T.qty, col.qty, 'center'); head(T.item, col.item, 'right');
    y += 26;
    rule();
    y += 5;
    const lines: any[] = Array.isArray(inv.lines) ? inv.lines : [];
    for (const l of lines.slice(0, 60)) {
      const label = LINE_LABELS[String(l.key)];
      const primary = l.name_ar || (label && label.ar) || l.name_en || String(l.key);
      const secondary = l.name_ar ? l.name_en : label ? label.en : null;
      space(34);
      doc.fillColor(INK);
      drawBidi(doc, primary, col.item[0], y, col.item[1], { fonts: reg, size: 10, align: 'right' });
      if (secondary) { doc.fillColor(MUTED); drawBidi(doc, String(secondary), col.item[0], y + 15, col.item[1], { fonts: reg, size: 8, align: 'right' }); }
      doc.fillColor(INK);
      drawBidi(doc, String(l.qty ?? 1), col.qty[0], y, col.qty[1], { fonts: reg, size: 10, align: 'center' });
      drawBidi(doc, money(l.unit_price), col.unit[0], y, col.unit[1], { fonts: reg, size: 10, align: 'left' });
      drawBidi(doc, money(l.amount), col.amount[0], y, col.amount[1], { fonts: reg, size: 10, align: 'left' });
      y += secondary ? 29 : 19;
    }
    rule();
    y += 6;

    // ── Totals ──
    if (Number(inv.discount) > 0) row(T.discount, `-${sar(inv.discount)}`);
    if (receipt) {
      // not VAT-registered: no subtotal, no VAT line, no rate; the total is what was paid (or refunded)
      row(credit ? T.totalRefunded : T.totalPaid, sar(inv.total), { bold: true, size: 12, color: credit ? ACCENT : INK });
    } else {
      row(T.subtotal, sar(inv.subtotal));
      const pct = Math.round((Number(inv.vat_rate) || 0) * 1000) / 10;
      // Model A: the platform's VAT is only the VAT in the delivery fee it charges; the service price carries none
      const vatLabel = inv.vat_basis === 'delivery_fee' ? { ar: `${T.vatOnDelivery.ar} ${pct}%`, en: `${T.vatOnDelivery.en} ${pct}%` } : { ar: `${T.vatLine.ar} ${pct}%`, en: `${T.vatLine.en} ${pct}%` };
      row(vatLabel, sar(inv.vat_amount));
      row(T.total, sar(inv.total), { bold: true, size: 12, color: credit ? ACCENT : INK });
    }

    // ── Payment, insurance, state ──
    section(T.paymentSection);
    if (inv.payment?.method) {
      const m = METHOD[String(inv.payment.method)] ?? { ar: String(inv.payment.method), en: String(inv.payment.method) };
      row(T.payment, `${m.ar} / ${m.en}${inv.payment.last4 ? `\n•••• ${inv.payment.last4}` : ''}`);
    } else {
      row(T.payment, `${T.notAvailable.ar} / ${T.notAvailable.en}`);
    }
    if (inv.insured) {
      if (inv.insured.insurer) row(T.insurer, String(inv.insured.insurer));
      row(T.servicePrice, sar(inv.insured.price));
      row(T.insurerShare, sar(inv.insured.insurer_share));
      row(T.patientShare, sar(inv.insured.patient_share), { bold: true });
    }

    // ── Footer on every page: support, refund policy, electronically generated ──
    const f = inv.footer ?? {};
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      let fy = 790;
      doc.moveTo(X, fy - 6).lineTo(X + W, fy - 6).strokeColor(LINE).lineWidth(0.6).stroke();
      const contact = [f.support_email, f.support_phone].filter(Boolean).join('  ·  ') || `${T.notConfigured.ar} / ${T.notConfigured.en}`;
      doc.fillColor(MUTED);
      drawBidi(doc, `${T.support.en}: ${contact}`, X, fy, W / 2, { fonts: reg, size: 8, align: 'left', base: 'ltr' });
      drawBidi(doc, `${T.refundPolicy.ar}: ${f.refund_policy_url?.ar ?? ''}`, X + W / 2, fy, W / 2, { fonts: reg, size: 8, align: 'right' });
      if (f.refund_policy_url?.ar) doc.link(X + W / 2, fy, W / 2, 10, f.refund_policy_url.ar);
      fy += 12;
      const elec = receipt ? T.electronicReceipt : T.electronic;
      drawBidi(doc, `${elec.en}`, X, fy, W / 2, { fonts: reg, size: 8, align: 'left', base: 'ltr' });
      drawBidi(doc, `${elec.ar}`, X + W / 2, fy, W / 2, { fonts: reg, size: 8, align: 'right' });
      fy += 12;
      drawBidi(doc, `${inv.invoice_no}  ·  ${i - pages.start + 1}/${pages.count}`, X, fy, W, { fonts: reg, size: 7, align: 'center', base: 'ltr' });
    }
    doc.end();
  });
}

export { measureBidi, hasArabic };
