import { chiInquiryUrl, figuresForClass, filterInsurers, parseInsurerClasses } from './insuranceAdd';

describe('CHI inquiry link', () => {
  const ok = 'https://www.chi.gov.sa/ServicesDirectory/Pages/CheckInsurance.aspx';
  it('takes the https chi.gov.sa address of /config', () => {
    expect(chiInquiryUrl({ links: { chi_inquiry: ok } })).toBe(ok);
  });
  it.each([null, undefined, {}, { links: {} }, { links: { chi_inquiry: 5 } }, { links: { chi_inquiry: 'http://www.chi.gov.sa/x' } }, { links: { chi_inquiry: 'https://chi.gov.sa.evil.example/x' } }, { links: { chi_inquiry: 'javascript:alert(1)' } }])('shows no link for %p', (config) => {
    expect(chiInquiryUrl(config)).toBeNull();
  });
});

describe('insurer search', () => {
  const list = [
    { code: 'bupa', name_ar: 'بوبا العربية', name_en: 'Bupa Arabia' },
    { code: 'tawuniya', name_ar: 'التعاونية', name_en: 'Tawuniya' },
    { code: 'medgulf', name_ar: 'ميدغلف', name_en: 'Medgulf' },
  ];
  it('shows all while empty and narrows by Arabic name, English name or code', () => {
    expect(filterInsurers(list, '  ')).toHaveLength(3);
    expect(filterInsurers(list, 'تعاون').map((c) => c.code)).toEqual(['tawuniya']);
    expect(filterInsurers(list, 'ARA').map((c) => c.code)).toEqual(['bupa']);
    expect(filterInsurers(list, 'medg').map((c) => c.code)).toEqual(['medgulf']);
    expect(filterInsurers(list, 'zzz')).toEqual([]);
  });
});

describe('classes and copay figures', () => {
  const rows = [
    { code: 'class-b', name_ar: 'الفئة ب', name_en: 'Class B', copay_percent: 10, copay_cap_sar: 200 },
    { code: 'tier-1', name_ar: 'الأولى', name_en: 'Tier 1' },
    { code: 'bad', name_ar: 'س', name_en: 'Bad', copay_percent: 150, copay_cap_sar: -4 },
    { name_ar: 'no code' },
    null,
  ];
  it('keeps the catalogue figures only when they are in range and drops rows without a code', () => {
    const [b, tier, bad, ...rest] = parseInsurerClasses(rows);
    expect(b).toMatchObject({ code: 'class-b', copayPercent: 10, copayCapSar: 200 });
    expect(tier.copayPercent).toBeUndefined();
    expect(bad.copayPercent).toBeUndefined();
    expect(bad.copayCapSar).toBeUndefined();
    expect(rest).toEqual([]);
    expect(parseInsurerClasses('nope')).toEqual([]);
  });
  it('fill the two boxes on choosing and leave what was typed when the class has no figures', () => {
    const [b, tier] = parseInsurerClasses(rows);
    expect(figuresForClass(b, { percent: '', cap: '' })).toEqual({ percent: '10', cap: '200' });
    expect(figuresForClass(b, { percent: '35', cap: '9' })).toEqual({ percent: '10', cap: '200' });
    expect(figuresForClass(tier, { percent: '35', cap: '9' })).toEqual({ percent: '35', cap: '9' });
    expect(figuresForClass(null, { percent: '1', cap: '2' })).toEqual({ percent: '1', cap: '2' });
  });
});
