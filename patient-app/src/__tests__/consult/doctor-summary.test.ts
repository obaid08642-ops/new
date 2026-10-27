import { readFileSync } from 'fs';
import { join } from 'path';
import { slotBarLabel, summaryItems } from '../../utils/doctorSummary';

const source = readFileSync(join(__dirname, '../../../app/consultations/doctor/[id].tsx'), 'utf8');
const LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'tl'];
const num = (n: number, o?: Intl.NumberFormatOptions) => new Intl.NumberFormat('en', o).format(n);
const waitText = (m: string) => `Avg. wait ${m} min`;

describe('doctor summary line (app)', () => {
  it('has specialty, stars with count, fee and wait', () => {
    expect(summaryItems({ specialty: 'Cardiology', rating: 4.8, reviews: 120, feeText: '150 SAR', waitMinutes: 15, num, waitText })).toEqual(['Cardiology', '★ 4.8 (120)', '150 SAR', 'Avg. wait 15 min']);
  });
  it('leaves out what the server did not send', () => {
    expect(summaryItems({ specialty: 'Cardiology', rating: 0, reviews: 0, waitMinutes: undefined, num, waitText })).toEqual(['Cardiology']);
    expect(summaryItems({ rating: 4, num, waitText })).toEqual(['★ 4']);
  });
});

describe('sticky bar label (app)', () => {
  const start = new Date(2026, 9, 30, 17, 30).toISOString();
  it('is null (bar disabled) with no chosen slot or an unreadable one', () => {
    expect(slotBarLabel('en', null, '150 SAR')).toBeNull();
    expect(slotBarLabel('en', 'bad', '150 SAR')).toBeNull();
  });
  it('shows day, time and fee once a slot is chosen', () => {
    const label = slotBarLabel('en', start, '150 SAR') ?? '';
    expect(label).toContain('Fri');
    expect(label).toContain('Oct');
    expect(label).toMatch(/5:30\s?PM/i);
    expect(label.endsWith('150 SAR')).toBe(true);
  });
});

describe('doctor profile sticky bar and summary wiring (app)', () => {
  it('disables the Book button until a slot is chosen, in the screen footer', () => {
    expect(source).toContain('accessibilityState={{ disabled: true }}');
    expect(source).toContain('{barLabel ? (');
    expect(source).toContain("k('consult.doc.stickyChooseTime')");
    expect(source).toContain('footer={footer}');
  });
  it('draws the summary under the name', () => {
    expect(source.indexOf('accessibilityRole="header"')).toBeLessThan(source.indexOf('testID="doctor-summary"'));
  });
  it.each(LANGS)('%s has the new keys', (lang) => {
    const m = JSON.parse(readFileSync(join(__dirname, `../../i18n/locales/${lang}.json`), 'utf8')) as Record<string, string>;
    for (const key of ['consult.doc.stickyBook', 'consult.doc.stickyChooseTime', 'consult.doc.summaryLabel', 'consult.card.wait']) expect(m[key]).toBeTruthy();
  });
});
