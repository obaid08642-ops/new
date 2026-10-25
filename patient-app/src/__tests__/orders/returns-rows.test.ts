import { buildRows, inBucket, kindsPresent, ofKind } from '../../utils/orderCenter';

const pick = () => null;
const payload = [
  { id: 'r1', order_id: 'abcdef123456', reason: 'Damaged', amount: 45, status: 'pending', createdAt: '2026-10-02T10:00:00Z' },
  { id: 'r2', order_id: 'abcdef123456', reason: 'Wrong item', amount: '30.5', status: 'REFUNDED', createdAt: '2026-10-01T10:00:00Z' },
  { reason: 'no id' },
];

describe('returns in the orders list (GET /pharmacy/returns)', () => {
  const rows = buildRows({ returns: payload }, pick);

  it('builds one row per return with reason, amount, status and the detail route', () => {
    expect(rows.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(rows[0]).toMatchObject({ kind: 'returns', title: 'Damaged', action: 'details', route: { pathname: '/returns/detail', params: { returnId: 'r1' } } });
    expect(rows[0].amount?.value).toBe(45);
    expect(rows[1].amount?.value).toBe(30.5);
    expect(rows[0].sub).toMatchObject({ key: 'orders.sub.returnOf' });
  });

  it('reads pending as under review (current) and refunded as previous', () => {
    expect(rows[0].look).toMatchObject({ label: 'underReview', tone: 'blue', bucket: 'current' });
    expect(rows[1].look).toMatchObject({ label: 'refunded', bucket: 'previous' });
    expect(inBucket(rows, 'previous').map((r) => r.id)).toEqual(['r2']);
  });

  it('offers the returns filter only when there are returns', () => {
    expect(kindsPresent(rows)).toEqual(['returns']);
    expect(ofKind(rows, 'returns')).toHaveLength(2);
    expect(kindsPresent(buildRows({ returns: [] }, pick))).toEqual([]);
    expect(buildRows({}, pick)).toEqual([]);
  });
});
