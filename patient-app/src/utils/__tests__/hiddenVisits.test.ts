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

import { hideStateOf, readVisitStates } from '../hiddenVisits';
describe('the orders centre rows (PT-54)', () => {
  const states = readVisitStates({ data: [
    { kind: 'pharmacy', id: 'p1', status: 'COMPLETED', hidden: false },
    { kind: 'pharmacy', id: 'p2', status: 'CANCELLED', hidden: true },
    { kind: 'lab', id: 'l1', status: 'CONFIRMED', hidden: false },
    { kind: 'consultation', id: 'c1', status: 'completed', hidden: false },
  ] });
  it('offers Hide for a finished visit and Show again for a hidden one, nothing for an open or unknown one', () => {
    expect(hideStateOf(states, 'pharmacy', 'p1')).toEqual({ kind: 'pharmacy', hidden: false });
    expect(hideStateOf(states, 'pharmacy', 'p2')).toEqual({ kind: 'pharmacy', hidden: true });
    expect(hideStateOf(states, 'labs', 'l1')).toBeNull();
    expect(hideStateOf(states, 'doctors', 'c1')).toEqual({ kind: 'consultation', hidden: false });
    expect(hideStateOf(states, 'returns', 'r1')).toBeNull();
    expect(hideStateOf(states, 'pharmacy', 'unknown')).toBeNull();
    expect(hideStateOf(new Map(), 'pharmacy', 'p1')).toBeNull();
  });
});
