import { englishNameUnder, resolveMedicinePublicDto } from './med-i18n';
import { MedicinesService } from './medicines.service';

/**
 * Owner decision E (issue 1556, 2026-10-16): ur, hi and bn pages show the localized name with the English name under
 * it (not ar, en or fil), and a search matches both.
 */
const raw = {
  id: 'med_e1', name_ar: 'بانادول 500', name_en: 'Panadol 500 mg 24 Tablets',
  translations: {
    ur: { name: 'پیناڈول 500' }, hi: { name: 'पैनाडोल 500' }, bn: { name: 'প্যানাডল 500' }, tl: { name: 'Panadol 500 tableta' },
  },
};

describe('decision E: the English name under the localized one', () => {
  it.each(['ur', 'hi', 'bn'])('a %s product answer carries the English name', (locale) => {
    const dto = resolveMedicinePublicDto(raw, locale);
    expect(dto.name).not.toBe(raw.name_en);
    expect(dto.english_name).toBe('Panadol 500 mg 24 Tablets');
  });

  it.each(['ar', 'en', 'fil'])('a %s product answer has none', (locale) => {
    expect(resolveMedicinePublicDto(raw, locale).english_name).toBeNull();
  });

  it('none when the localized name already is the English one, or there is no English name', () => {
    expect(englishNameUnder('ur', 'Panadol', 'Panadol')).toBeNull();
    expect(englishNameUnder('hi', 'पैनाडोल', '  ')).toBeNull();
    expect(englishNameUnder('bn', 'প্যানাডল', undefined)).toBeNull();
  });
});

describe('decision E: the catalogue search matches the localized and the English names', () => {
  function serviceWith() {
    const calls: { query?: unknown } = {};
    const service = Object.create(MedicinesService.prototype) as { model: unknown; withBadges: unknown; filtered: MedicinesService['filtered'] };
    const chain = { sort: () => chain, skip: () => chain, limit: () => chain, then: (resolve: (rows: unknown[]) => void) => resolve([{ id: 'm1' }]) };
    service.model = { find: (q: unknown) => { calls.query = q; return chain; }, countDocuments: jest.fn().mockResolvedValue(1) };
    service.withBadges = (m: unknown) => m;
    return { service, calls };
  }

  it.each([['पैनाडोल', 'hi'], ['پیناڈول', 'ur'], ['প্যানাডল', 'bn']])('a %s query searches translations.%s.name and the English name', async (term, db) => {
    const { service, calls } = serviceWith();
    await service.filtered(term, undefined, { forms: [], brands: [], rx_only: false }, 'relevant', undefined, 20);
    const ors = JSON.stringify(calls.query);
    expect(ors).toContain(`"translations.${db}.name":{"$regex":"${term}"`);
    expect(ors).toContain(`"name_en":{"$regex":"${term}"`);
  });
});
