import { isPublishableTrendingTerm, TRENDING_MIN_SEARCHES } from './medicines.service';

describe('trending searches: what may be published to everyone', () => {
  it('keeps ordinary search terms', () => {
    for (const t of ['panadol', 'بنادول', 'vitamin d', 'فيتامين د 1000']) expect(isPublishableTrendingTerm(t)).toBe(true);
  });

  it('drops contact-looking terms and odd lengths', () => {
    for (const t of ['0551234567', '٠٥٥١٢٣٤٥٦٧', 'a@b.com', 'x', '', 'a'.repeat(41), null, 42]) expect(isPublishableTrendingTerm(t)).toBe(false);
  });

  it('needs several searches before a term is common enough to show', () => {
    expect(TRENDING_MIN_SEARCHES).toBeGreaterThanOrEqual(5);
  });
});
