import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '../../../app/consultations/doctor/[id].tsx'), 'utf8');
const at = (needle: string) => source.indexOf(needle);

describe('doctor screen render fixes (G3, app)', () => {
  it('puts the appointments right after the main info and the remaining stats below them, before the photos and About', () => {
    const card = at('testID="doctor-summary"');
    const visit = at("<Section title={k('consult.book.visitType')}>");
    const slots = at("<Section title={k('consult.doc.bookTitle')}>");
    const stats = at('testID="doctor-stats"');
    const about = at("<Section title={k('consult.doc.about')}>");
    expect(card).toBeGreaterThan(0);
    expect(visit).toBeGreaterThan(card);
    expect(slots).toBeGreaterThan(visit);
    expect(stats).toBeGreaterThan(slots);
    expect(about).toBeGreaterThan(stats);
  });
  it('keeps each fact once: rating, review count and wait are only in the summary line', () => {
    expect(source).not.toContain("k('consult.doc.reviews')");
    expect(source).not.toContain("k('consult.doc.average')");
    expect(source).not.toContain("k('consult.doc.waitMinutes')");
    expect(source).toContain("k('consult.doc.years')");
  });
  it('draws the disabled Book with the sunken background and primary text, not half opacity', () => {
    expect(source).toContain('backgroundColor: c.bg.sunken');
    expect(source).toMatch(/disabled: true[\s\S]{0,400}c\.text\.primary/);
    expect(source).not.toContain('disabled={!barLabel}');
  });
});
