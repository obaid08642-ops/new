import { readFileSync } from 'fs';
import { join } from 'path';

/** Owner review G3: the order of the doctor profile and the keys it uses in the six languages. */
const source = readFileSync(join(__dirname, '../../../app/consultations/doctor/[id].tsx'), 'utf8');
const LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'tl'];

describe('doctor profile order (app)', () => {
  const at = (needle: string) => {
    const i = source.indexOf(needle);
    expect(i).toBeGreaterThan(-1);
    return i;
  };
  it('is photo, main info, appointments, gallery, about, more, education, reviews', () => {
    const order = [at('aspectRatio: 4 / 3'), at("<Section title={k('consult.doc.bookTitle')}>"), at("key: 'clinic'"), at("k('consult.doc.about')"), at("k('consult.doc.more')"), at("<Section title={k('consult.doc.education')}>"), at("<Section title={k('consult.doc.patientReviews')}>")];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it('shows the day strip and the time chips straight under the appointments title, with a retry on error', () => {
    const block = source.slice(at("<Section title={k('consult.doc.bookTitle')}>"), at("k('consult.doc.services')"));
    expect(block.indexOf('<DayStrip')).toBeLessThan(block.indexOf('<SlotGrid'));
    expect(block).toContain("k('consult.retry')");
  });
  it('hides the gallery sections when the server sent no photos', () => {
    expect(source).toContain('.filter((g) => Array.isArray(g.urls) && g.urls.length > 0)');
  });
  it.each(LANGS)('%s has every key the profile uses', (lang) => {
    const messages = JSON.parse(readFileSync(join(__dirname, `../../i18n/locales/${lang}.json`), 'utf8')) as Record<string, string>;
    const keys = ['consult.retry', 'consult.today', 'consult.tomorrow', 'consult.book.day', 'consult.slots.none', 'consult.slots.error', 'consult.doc.education', 'consult.doc.noEducation', 'consult.doc.more', 'consult.doc.about', 'consult.doc.clinicPhotos', 'consult.doc.bookTitle'];
    for (const key of keys) expect(messages[key]).toBeTruthy();
  });
});
