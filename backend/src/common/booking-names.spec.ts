import { idsOf, loadCatalogue, namesOf, resolveLineNames, withItemNames, withScanNames, withServiceNames } from './booking-names';

// names are Arabic and English only (owner decision 2026-10-25); an old row that still holds name_ur/hi/bn/tl is read as ar/en
const cbc = { id: 'cbc', name_ar: 'صورة دم', name_en: 'CBC', name_ur: 'خون', name_hi: 'रक्त', name_bn: 'রক্ত', name_tl: 'Dugo' };

describe('booking names (issue 1832): the catalogue name in the reader\'s language, the stored Arabic/English as the fallback', () => {
  it('namesOf drops empty values', () => {
    expect(namesOf({ name_ar: 'ا', name_en: ' ', name_hi: 'ह' })).toEqual({ ar: 'ا' });
    expect(namesOf(null)).toEqual({});
  });

  it('the resolver: Arabic and English from the catalogue row (other languages on an old row are ignored), the stored line only fills what the row lacks', () => {
    expect(resolveLineNames({ name_ar: 'قديم', name_en: 'old' }, cbc)).toEqual({ ar: 'صورة دم', en: 'CBC' });
    // a catalogue row with no English: the booking's stored English stays
    expect(resolveLineNames({ name_ar: 'قديم', name_en: 'old' }, { id: 'x', name_ar: 'جديد' })).toEqual({ ar: 'جديد', en: 'old' });
  });

  it('an old booking without an id (or with an id the catalogue no longer has) falls back to its stored names', () => {
    expect(resolveLineNames({ name_ar: 'قديم', name_en: 'old' }, undefined)).toEqual({ ar: 'قديم', en: 'old' });
    expect(resolveLineNames({}, undefined)).toEqual({});
  });

  it('idsOf: distinct strings only, capped', () => {
    expect(idsOf(['a', 'a', 'b', null, 3, '', undefined])).toEqual(['a', 'b']);
    expect(idsOf(Array.from({ length: 900 }, (_, i) => `id${i}`)).length).toBe(500);
  });

  it('loadCatalogue is one query and a failing read leaves the stored names', async () => {
    const load = jest.fn(async () => [cbc]);
    expect((await loadCatalogue(load, ['cbc'])).get('cbc')).toBe(cbc);
    expect(load).toHaveBeenCalledTimes(1);
    expect(await loadCatalogue(async () => { throw new Error('db'); }, ['cbc'])).toEqual(new Map());
    const none = jest.fn();
    await loadCatalogue(none, []);
    expect(none).not.toHaveBeenCalled();
  });

  it('lab/radiology lines: a list of bookings resolves with ONE query, old lines fall back, a locale switch needs no new read', async () => {
    const load = jest.fn(async (ids: string[]) => [cbc].filter((r) => ids.includes(r.id)));
    const rows = await withItemNames([
      { id: 'b1', items: [{ service_id: 'cbc', name_ar: 'قديم', name_en: 'old' }, { service_id: 'gone', name_ar: 'محذوف', name_en: 'deleted' }] },
      { id: 'b2', items: [{ name_ar: 'بلا معرف', name_en: 'no id' }] },
      { id: 'b3' },
    ], load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(['cbc', 'gone']);
    expect(rows[0].items![0].names).toEqual({ ar: 'صورة دم', en: 'CBC' });
    expect(rows[0].items![1].names).toEqual({ ar: 'محذوف', en: 'deleted' });
    expect(rows[1].items![0].names).toEqual({ ar: 'بلا معرف', en: 'no id' });
    expect(rows[2]).toEqual({ id: 'b3' });
    // the same payload serves every locale: the reader shows `ar` on the Arabic page and `en` on every other
    expect(rows[0].items![0].names.en).toBe('CBC');
  });

  it('nursing: service_names from service_id; an old booking keeps service_name_ar/en', async () => {
    const svc = { id: 's1', name_ar: 'جروح', name_en: 'Wound care', name_hi: 'घाव' };
    const out = await withServiceNames([
      { id: 'n1', service_id: 's1', service_name_ar: 'قديم', service_name_en: 'old' },
      { id: 'n2', service_name_ar: 'قديم', service_name_en: 'old' },
    ], async () => [svc]);
    expect(out[0].service_names).toEqual({ ar: 'جروح', en: 'Wound care' });
    expect(out[1].service_names).toEqual({ ar: 'قديم', en: 'old' });
  });

  it('radiology: scan_names is the first line\'s resolution, or the stored scan name for a booking without lines', () => {
    expect(withScanNames({ items: [{ names: { ar: 'أ', en: 'A' } }], scan_name_ar: 'قديم' }).scan_names).toEqual({ ar: 'أ', en: 'A' });
    expect(withScanNames({ scan_name_ar: 'قديم', scan_name_en: 'old' }).scan_names).toEqual({ ar: 'قديم', en: 'old' });
  });
});
