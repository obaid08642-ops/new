import { matchInteractions, pairInteractions } from './interaction-rules';

describe('interaction rules (22.3)', () => {
  it('pairs a warfarin with an aspirin in either order', () => {
    expect(pairInteractions(['Warfarin'], ['Aspirin 81mg']).map((h) => h.code)).toEqual(['bleeding_risk']);
    expect(pairInteractions(['أسبرين'], ['وارفارين']).map((h) => h.code)).toEqual(['bleeding_risk']);
  });

  it('finds nothing between unrelated medicines', () => {
    expect(pairInteractions(['Paracetamol'], ['Vitamin C'])).toEqual([]);
  });

  it('matchInteractions finds a rule whose two sides are both in one list (the patient check)', () => {
    expect(matchInteractions(['Simvastatin', 'Clarithromycin']).map((h) => h.severity)).toEqual(['high']);
    expect(matchInteractions(['Simvastatin'])).toEqual([]);
  });
});
