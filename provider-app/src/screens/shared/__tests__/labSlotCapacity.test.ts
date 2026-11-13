import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCapacity, slotCapacityUrl, SLOT_CAPACITY_URL } from '../labSlotCapacity';

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

describe('radiology slot capacity route', () => {
  it('uses the radiology route and the lab route for labs', () => {
    expect(slotCapacityUrl('radiology')).toBe('/radiology/provider/slot-capacity');
    expect(slotCapacityUrl('lab')).toBe(SLOT_CAPACITY_URL);
  });
  it('the backend serves GET and PUT on that route (path contract)', () => {
    const src = readFileSync(join(__dirname, '../../../../../backend/src/modules/radiology/radiology.controller.ts'), 'utf8');
    expect(src).toMatch(/@Get\('provider\/slot-capacity'\)/);
    expect(src).toMatch(/@Put\('provider\/slot-capacity'\)/);
  });
});
