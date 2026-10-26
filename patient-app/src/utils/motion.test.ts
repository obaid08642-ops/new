import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MOTION } from './motion';

const tokens = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'packages', 'design-tokens', 'tokens.json'), 'utf8')).motion;
const ms = (value: string) => Number.parseInt(value, 10);

describe('the motion values a script uses are the design tokens', () => {
  it('press, enter and enterMax repeat motion.duration.* of the tokens; the flight is 300 to 450 ms', () => {
    expect(MOTION.press).toBe(ms(tokens.duration.press));
    expect(MOTION.pop).toBe(ms(tokens.duration.enter));
    expect(MOTION.toast).toBe(ms(tokens.duration.enterMax));
    expect(MOTION.flight).toBeGreaterThanOrEqual(300);
    expect(MOTION.flight).toBeLessThanOrEqual(450);
  });
});
