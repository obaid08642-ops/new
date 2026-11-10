import { parseCapacity, SLOT_CAPACITY_URL } from '../labSlotCapacity';

describe('lab slot capacity input', () => {
  it('accepts a whole number from 1 to 20 only', () => {
    expect(parseCapacity('1')).toBe(1);
    expect(parseCapacity(' 20 ')).toBe(20);
    for (const bad of ['', '0', '21', '2.5', '-1', 'ab', '100', '1e1']) expect(parseCapacity(bad)).toBeNull();
  });
  it('talks to the lab route the backend serves', () => {
    expect(SLOT_CAPACITY_URL).toBe('/labs/provider/slot-capacity');
  });
});
