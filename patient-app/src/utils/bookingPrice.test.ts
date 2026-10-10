import { translations } from '../i18n';
import { priceSummary } from './bookingPrice';

describe('priceSummary (390)', () => {
  it('shows the stored lines and the server total, and adds nothing up itself', () => {
    const summary = priceSummary({ price: 100, service_fee: 10, home_visit_fee: 0, total_price: 115, payment_status: 'paid' });
    expect(summary).toEqual({ lines: [{ key: 'fee', value: 100 }, { key: 'service', value: 10 }], total: 115, paid: true });
  });

  it('draws nothing when the server sent no amounts', () => {
    expect(priceSummary({ price: 0, total_price: 0 })).toBeNull();
    expect(priceSummary(null)).toBeNull();
  });

  it('has a real translation of every label in all six languages', () => {
    const bucket = translations as unknown as Record<string, Record<string, string>>;
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) {
      for (const key of ['title', 'fee', 'service', 'homeVisit', 'transport', 'total', 'paid', 'unpaid']) {
        expect(bucket[lang]?.[`consult.price.${key}`]?.trim()).toBeTruthy();
      }
    }
  });
});
