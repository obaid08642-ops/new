import { bidiPieces, bidiRuns, chunkParagraph, hasArabic, MAX_LINE_CHARS } from './pdf-bidi';

/** The line as it is drawn left to right on the page: the pieces joined in drawing order (each Arabic word is a piece, so words appear last-first). */
const visual = (text: string, base: 'ltr' | 'rtl' = hasArabic(text) ? 'rtl' : 'ltr') => bidiPieces(text, base).map((p) => p.text).join('');

describe('mixed Arabic, Latin and numbers in one line', () => {
  it('a plain English line is one left-to-right run, untouched', () => {
    expect(bidiRuns('Invoice No: INV-2026-000007', 'ltr')).toEqual([{ text: 'Invoice No: INV-2026-000007', rtl: false }]);
    expect(visual('Invoice No: INV-2026-000007')).toBe('Invoice No: INV-2026-000007');
  });

  it('an Arabic line is one right-to-left run (pdfkit shapes and orders its glyphs)', () => {
    expect(bidiRuns('فاتورة ضريبية مبسطة', 'rtl')).toEqual([{ text: 'فاتورة ضريبية مبسطة', rtl: true }]);
  });

  it('a number after an Arabic label goes to the left of it, in its own order', () => {
    expect(visual('الرقم الضريبي: 300000000000003')).toBe('300000000000003 :الضريبي الرقم');
  });

  it('numbers keep their signs, separators and units together: -115.00, 15%, 1,500.50, 2026-11-01 12:30', () => {
    for (const n of ['-115.00', '15%', '1,500.50', '2026-11-01', '12:30']) {
      const runs = bidiRuns(`المبلغ ${n} ر.س`, 'rtl');
      expect(runs.some((r) => r.text.includes(n))).toBe(true);
    }
  });

  it('an English name inside an Arabic sentence stays left to right', () => {
    const runs = bidiRuns('العميل: Ahmed Al-Qahtani', 'rtl');
    expect(runs[0]).toEqual({ text: 'Ahmed Al-Qahtani', rtl: false });
    expect(visual('العميل: Ahmed Al-Qahtani')).toBe('Ahmed Al-Qahtani :العميل');
  });

  it('brackets in Arabic text are mirrored so the enclosure reads normally', () => {
    expect(visual('أ (ب)')).toBe('(ب) أ');
    expect(visual('المجموع (شامل الضريبة): 115.00')).toBe('115.00 :(الضريبة شامل) المجموع');
  });

  it('an English line stays left to right even with Arabic inside (the base direction is the line\'s)', () => {
    expect(visual('Name: مختبر الحبيب', 'ltr')).toBe('Name: الحبيب مختبر'); // 'Name:' first on the left; the Arabic phrase reads right to left
  });

  it('Arabic letters are told apart from Arabic-Indic digits, which count as numbers', () => {
    expect(hasArabic('١٢٣')).toBe(false);
    expect(hasArabic('رقم ١٢٣')).toBe(true);
  });

  it('an empty line has no runs', () => {
    expect(bidiRuns('', 'rtl')).toEqual([]);
  });
});

describe('line length bound (CodeQL loop-bound-injection)', () => {
  it('chunkParagraph keeps every character, cutting at spaces and hard for a long word', () => {
    const text = Array.from({ length: 900 }, (_, i) => `كلمة${i}`).join(' ');
    const parts = chunkParagraph(text, 500);
    expect(parts.length).toBeGreaterThan(5);
    expect(parts.every((p) => [...p].length <= 500)).toBe(true);
    expect(parts.join(' ')).toBe(text);
    const word = 'x'.repeat(1300);
    expect(chunkParagraph(word, 500).join('')).toBe(word);
  });
  it('a line over the bound is refused, not looped over', () => {
    expect(() => bidiRuns('a'.repeat(MAX_LINE_CHARS + 1), 'ltr')).toThrow('bidi_line_too_long');
    expect(bidiRuns('a'.repeat(MAX_LINE_CHARS), 'ltr')).toHaveLength(1);
  });
});
