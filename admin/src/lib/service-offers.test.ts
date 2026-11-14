import { describe, expect, it } from 'vitest';
import { filterOffers, priceText, whereText, type ServiceOfferAdminRow } from './service-offers';

const rows: ServiceOfferAdminRow[] = [
  { provider_account_id: 'p1', service_id: 'CBC', offered: true, where: 'home', insurance: true, price: 40, currency: 'SAR', service_name_ar: 'صورة دم', service_name_en: 'CBC', provider_name_ar: 'مختبر النخبة' },
  { provider_account_id: 'p2', service_id: 'CBC', offered: false, where: null, price: null, service_name_ar: 'صورة دم', provider_name_en: 'North Lab' },
];

describe('service offers admin rows', () => {
  it('words where, and price', () => {
    expect(whereText('home')).toBe('في المنزل');
    expect(whereText('both')).toBe('في المنشأة وفي المنزل');
    expect(whereText(null)).toBe('—');
    expect(priceText(rows[0])).toBe('40 ر.س');
    expect(priceText(rows[1])).toBe('—');
  });
  it('filters by text on names and ids, and by offered only', () => {
    expect(filterOffers(rows, '', false)).toHaveLength(2);
    expect(filterOffers(rows, '', true)).toHaveLength(1);
    expect(filterOffers(rows, 'north', false).map((r) => r.provider_account_id)).toEqual(['p2']);
    expect(filterOffers(rows, 'النخبة', false).map((r) => r.provider_account_id)).toEqual(['p1']);
    expect(filterOffers(rows, 'cbc', true)).toHaveLength(1);
  });
});
