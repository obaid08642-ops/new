import { canHideStatus, hideVisitPath, readHiddenIds } from '../hiddenVisits';

describe('hiddenVisits (PT-54)', () => {
  it('reads the hidden ids of one kind from the timeline', () => {
    const rows = [
      { kind: 'consultation', id: 'a', hidden: true },
      { kind: 'consultation', id: 'b', hidden: false },
      { kind: 'lab', id: 'c', hidden: true },
    ];
    expect([...readHiddenIds({ data: rows }, 'consultation')]).toEqual(['a']);
    expect([...readHiddenIds(rows, 'lab')]).toEqual(['c']);
    expect(readHiddenIds(null, 'lab').size).toBe(0);
  });
  it('only finished visits can be hidden', () => {
    expect(canHideStatus('completed')).toBe(true);
    expect(canHideStatus('CANCELLED')).toBe(true);
    expect(canHideStatus('confirmed')).toBe(false);
  });
  it('builds the hide and unhide paths', () => {
    expect(hideVisitPath('consultation', 'x/1', true)).toBe('/unified-bookings/consultation/x%2F1/hide');
    expect(hideVisitPath('lab', '2', false)).toBe('/unified-bookings/lab/2/unhide');
  });
});
