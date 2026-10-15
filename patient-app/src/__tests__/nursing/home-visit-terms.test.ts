import { homeVisitTermLines } from '../../utils/homeVisitTerms';

// Journeys 66 (decision 26): the home-visit terms come from the server's refund policy; nothing is written without its numbers.
const k = (key: string, vars?: Record<string, string | number>) => `${key}${vars ? JSON.stringify(vars) : ''}`;
const money = (n: number) => n.toFixed(2);

describe('home visit cancellation terms', () => {
  it('say the full refund, the trip fee and the absent rule from the server', () => {
    expect(homeVisitTermLines({ home_visit: { trip_fee_sar: 40, patient_absent_percent: 0 } }, k, money)).toEqual([
      'nur.terms.beforeOnTheWay',
      'nur.terms.afterOnTheWay{"fee":"40.00"}',
      'nur.terms.absent{"percent":0}',
    ]);
  });

  it('draw nothing without the policy, and skip a missing number', () => {
    expect(homeVisitTermLines(null, k, money)).toEqual([]);
    expect(homeVisitTermLines({ home_visit: { patient_absent_percent: 10 } }, k, money)).toEqual(['nur.terms.beforeOnTheWay', 'nur.terms.absent{"percent":10}']);
  });
});
