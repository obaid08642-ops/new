import * as PDFDocument from 'pdfkit';
import { drawBidi, hasArabic, wrapBidi } from './pdf-bidi';
import { alignBaselines, registerPdfFonts } from './pdf-fonts';

/**
 * A plain text PDF (title, then lines) that keeps Arabic: letters are shaped by the Arabic font, mixed lines are ordered by
 * pdf-bidi, long lines are wrapped and the text runs onto new pages. Used by the legal certificates and reports; the old writer
 * replaced every non-ASCII character with a space, so an Arabic certificate was empty.
 */
export async function renderTextPdf(title: string, lines: string[], opts: { info?: Record<string, string> } = {}): Promise<Buffer> {
  const Doc: any = (PDFDocument as any).default || PDFDocument;
  const doc = new Doc({ size: 'A4', margin: 50, info: { Title: title.slice(0, 200), ...(opts.info || {}) } });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const fonts = registerPdfFonts(doc);
  const pdf = alignBaselines(doc, fonts);
  const X = 50;
  const W = doc.page.width - 100;
  const bottom = doc.page.height - 60;
  let y = 50;
  const put = (text: string, size: number, bold: boolean) => {
    const f = bold ? fonts.bold : fonts.reg;
    const wrapped = wrapBidi(pdf, text, W, { fonts: f, size });
    for (const l of wrapped.length ? wrapped : ['']) {
      if (y + size * 1.5 > bottom) { doc.addPage(); y = 50; }
      if (l) drawBidi(pdf, l, X, y, W, { fonts: f, size });
      y += size * 1.5;
    }
  };
  doc.fillColor('#111');
  put(title, 16, true);
  y += 8;
  for (const line of lines) put(String(line ?? ''), 10, false);

  doc.end();
  return done;
}

export { hasArabic };
