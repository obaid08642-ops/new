import { buildBody, draftError, draftFromRow, matchesSearch, parsePrice, shownPrice, whereOptions, type ServiceOfferRow } from '../myServicesLogic';

const row = (o: Partial<ServiceOfferRow> = {}): ServiceOfferRow => ({
  service_id: 's1', code: 'CBC', name_ar: 'صورة دم', name_en: 'Blood count', category: 'blood', image_url: null,
  catalogue_price: 110, home_visit_supported: false, offered: false, where: null, insurance: false, price: null, currency: 'SAR', ...o,
});

describe('parsePrice', () => {
  it.each([['95', 95], ['1,200', 1200], ['١٢٠٠', 1200], ['95.5', 95.5], ['٩٥٫٥', 95.5]])('reads %s', (t, n) => expect(parsePrice(t)).toBe(n));
  it.each(['', '0', '-5', 'abc', '1.234', '1e3'])('refuses %s', (t) => expect(parsePrice(t)).toBeNull());
});

describe('whereOptions', () => {
  it('lab/radiology offer home only when the service supports it', () => {
    expect(whereOptions('lab', row())).toEqual(['premises']);
    expect(whereOptions('radiology', row({ home_visit_supported: true }))).toEqual(['premises', 'home', 'both']);
  });
  it('nursing defaults to home', () => expect(whereOptions('nursing', row())[0]).toBe('home'));
});

describe('draft and body', () => {
  it('prefills the catalogue price for a service not yet offered', () => expect(draftFromRow('lab', row()).price).toBe('110'));
  it('prefers the own price over the catalogue price', () => expect(draftFromRow('lab', row({ offered: true, price: 95, where: 'premises' })).price).toBe('95'));
  it('refuses an offered service without a positive price', () => {
    expect(draftError({ offered: true, where: 'premises', insurance: false, price: '' })).toBe('price_invalid');
    expect(draftError({ offered: true, where: 'premises', insurance: false, price: '0' })).toBe('price_invalid');
  });
  it('lets a service be switched off without a price', () => expect(draftError({ offered: false, where: 'premises', insurance: false, price: '' })).toBeNull());
  it('sends the typed own price, where and insurance', () => {
    expect(buildBody('lab', row({ home_visit_supported: true }), { offered: true, where: 'both', insurance: true, price: '1,200' }))
      .toEqual({ offered: true, where: 'both', insurance: true, price: 1200 });
  });
  it('falls back to a valid where for the service', () => {
    expect(buildBody('lab', row(), { offered: true, where: 'home', insurance: false, price: '95' }).where).toBe('premises');
  });
  it('sends only offered:false and no price when switched off', () => {
    expect(buildBody('nursing', row(), { offered: false, where: 'home', insurance: true, price: '50' })).toEqual({ offered: false, insurance: false });
  });
});

describe('shownPrice and search', () => {
  it('shows the own price, else the catalogue price', () => {
    expect(shownPrice(row({ price: 95 }))).toBe(95);
    expect(shownPrice(row())).toBe(110);
    expect(shownPrice(row({ catalogue_price: null }))).toBeNull();
  });
  it('searches name, code and category in both languages', () => {
    expect(matchesSearch(row(), 'cbc')).toBe(true);
    expect(matchesSearch(row(), 'صورة')).toBe(true);
    expect(matchesSearch(row(), 'xray')).toBe(false);
  });
});
