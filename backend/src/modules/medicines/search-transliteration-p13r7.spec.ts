import { MedicinesService } from './medicines.service';

/**
 * P13-R7: the search pipeline transliterates across scripts, and a selected
 * category keeps results inside that category.
 * Red on the base: no transliteration step exists, so a Latin brand typed on
 * an Arabic keyboard layout (and vice versa, outside the static synonym list)
 * matches nothing.
 */
function serviceWith(rows: any[] = []) {
  const calls: any = {};
  const service: any = Object.create(MedicinesService.prototype);
  const chain: any = {
    sort: (o: any) => { calls.sort = o; return chain; },
    skip: (n: number) => { calls.skip = n; return chain; },
    limit: (n: number) => { calls.limit = n; return chain; },
    then: (resolve: any) => resolve(rows),
  };
  service.model = {
    find: (q: any) => { calls.query = q; return chain; },
    countDocuments: jest.fn().mockResolvedValue(7),
  };
  service.withBadges = (m: any) => m;
  return { service, calls };
}

describe('P13-R7 search transliteration and category scope', () => {
  it('a Latin brand also searches its Arabic transliteration', async () => {
    const { service, calls } = serviceWith([{ id: 'm1' }]);
    await service.filtered('banadol', undefined, { forms: [], brands: [], rx_only: false }, 'relevant', undefined, 20);
    // Faithful to the typed letters: b-a-n-a-d-o-l → ب-ا-ن-ا-د-و-ل.
    expect(JSON.stringify(calls.query)).toContain('بانادول');
  });

  it('an Arabic term outside the synonym list also searches its Latin transliteration', async () => {
    const { service, calls } = serviceWith([{ id: 'm1' }]);
    await service.filtered('مرهم', undefined, { forms: [], brands: [], rx_only: false }, 'relevant', undefined, 20);
    // Arabic omits short vowels: مرهم becomes the vowel-tolerant pattern m[aeiou]*r…,
    // which matches marham (and any vocalization) without inventing a spelling.
    const dumped = JSON.stringify(calls.query);
    expect(dumped).toContain('m[aeiou]*r');
    const m = dumped.match(/m\[aeiou\]\*r\[aeiou\]\*h\[aeiou\]\*m(?:\[aeiou\]\*)?/);
    expect(m).toBeTruthy();
    expect(new RegExp(m![0]).test('marham')).toBe(true);
  });

  it('a selected category keeps results inside that category', async () => {
    const { service, calls } = serviceWith([{ id: 'm1' }]);
    await service.filtered('vitamin', 'cosmetics', { forms: [], brands: [], rx_only: false }, 'relevant', undefined, 20);
    const q = calls.query;
    expect(JSON.stringify(q.$and)).toContain('المكياج والإكسسوارات');
    expect(JSON.stringify(q.$and)).toContain('vitamin');
  });
});
