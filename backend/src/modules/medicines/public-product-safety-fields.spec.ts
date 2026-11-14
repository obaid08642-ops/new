import { resolveMedicinePublicDto } from './med-i18n';
import { toPublicProductCard } from './public-medicine';

/** Design parity (#1819): the public product DTO carries the stored cold-chain flag and the interaction list. */
describe('public product: cold_chain and interactions', () => {
  const base = { id: 'm1', slug: 'm1', name_ar: 'دواء', name_en: 'Drug', price: 10 };

  it('reports the stored refrigeration flag, false by default', () => {
    expect(resolveMedicinePublicDto({ ...base, cold_chain: true }, 'en').cold_chain).toBe(true);
    expect(resolveMedicinePublicDto(base, 'en').cold_chain).toBe(false);
    expect(resolveMedicinePublicDto({ ...base, cold_chain: 'yes' }, 'en').cold_chain).toBe(false);
  });

  it('lists interacting ingredients as trimmed unique strings, capped, never a non-string', () => {
    const many = Array.from({ length: 40 }, (_, i) => `ing${i}`);
    expect(resolveMedicinePublicDto({ ...base, interactions: [' Warfarin ', 'Warfarin', '', 5, null, 'Aspirin'] }, 'en').interactions).toEqual(['Warfarin', 'Aspirin']);
    expect(resolveMedicinePublicDto({ ...base, interactions: many }, 'en').interactions).toHaveLength(30);
    expect(resolveMedicinePublicDto(base, 'en').interactions).toEqual([]);
    expect(resolveMedicinePublicDto({ ...base, interactions: 'warfarin' }, 'en').interactions).toEqual([]);
  });

  it('the product card (search results) does not carry them', () => {
    const card = toPublicProductCard({ ...base, cold_chain: true, interactions: ['Warfarin'] }, 'en') as Record<string, unknown>;
    expect(card).not.toHaveProperty('cold_chain');
    expect(card).not.toHaveProperty('interactions');
  });
});
