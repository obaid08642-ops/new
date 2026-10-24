import { buildBackup, checkConfirmation, csvSha256, loadTranslations, planFill } from './medicine-translation-fill';

const CSV = [
  'source,ur,hi,bn,fil,status',
  '"Labello, Moisturizing Lip Balm Berry - 3 gm",لیبیلو،ur,hi,bn,Labello Fil,machine',
  'Dove Nourishing Body Care Cream - 250 ml,Dove ur,Dove hi,Dove bn,Dove fil,machine',
].join('\n');
const map = loadTranslations(CSV);

describe('issue 1844: production apply rules', () => {
  it('the confirmation is the sha256 of the reviewed file, and nothing else', () => {
    const hash = csvSha256(CSV);
    expect(checkConfirmation(CSV, hash)).toBe(true);
    expect(checkConfirmation(CSV, undefined)).toBe(false);
    expect(checkConfirmation(CSV, '')).toBe(false);
    expect(checkConfirmation(CSV + '\n', hash)).toBe(false); // an edited file has another hash
  });

  it('a backup records the value each changed field had, and the file hash', () => {
    const rows = [{ id: 'm1', name_en: 'Dove Nourishing Body Care Cream - 250 ml', translations: {} }];
    const changes = planFill(rows, map);
    expect(changes.length).toBe(8); // name and official_name for ur, hi, bn, tl
    const backup = buildBackup(changes, csvSha256(CSV), 'nabd_x', new Date('2026-10-24T00:00:00Z'));
    expect(backup.csv_sha256).toBe(csvSha256(CSV));
    expect(backup.changes[0]).toEqual(expect.objectContaining({ id: 'm1', before: null }));
  });

  it('never overwrites a non-English value', () => {
    const rows = [{
      id: 'm2',
      name_en: 'Dove Nourishing Body Care Cream - 250 ml',
      translations: {
        ur: { name: 'ڈو باڈی کریم' },           // already Urdu: kept
        hi: { name: 'डव बॉडी क्रीम' },            // already Hindi: kept
        bn: { name: 'Dove বডি ক্রিম' },           // mixed, contains Bengali: kept
        tl: { name: 'Dove body cream sa Tagalog' }, // a Filipino value that is not the English: kept
      },
    }];
    const names = planFill(rows, map).filter((c) => c.field === 'name');
    expect(names).toEqual([]);
  });

  it('fills only empty or English values, and only from the reviewed file', () => {
    const rows = [{ id: 'm3', name_en: 'Dove Nourishing Body Care Cream - 250 ml', translations: { ur: { name: 'Dove Nourishing Body Care Cream - 250 ml' } } }];
    const changes = planFill(rows, map);
    const ur = changes.find((c) => c.locale === 'ur');
    expect(ur).toEqual(expect.objectContaining({ before: 'Dove Nourishing Body Care Cream - 250 ml', after: 'Dove ur' }));
    // a value that is in neither the file nor English is not touched
    const other = planFill([{ id: 'm4', name_en: 'Unknown Product', translations: { ur: { name: 'Something Latin' } } }], map);
    expect(other).toEqual([]);
  });
});
