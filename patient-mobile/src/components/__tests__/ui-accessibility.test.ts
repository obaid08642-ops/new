import fs from 'node:fs';
import path from 'node:path';

describe('shared patient UI accessibility contract', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'ui.tsx'), 'utf8');

  it('keeps interactive shared controls accessible and RTL-aware', () => {
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain("flexDirection: isRtlLang ? 'row-reverse' : 'row'");
    expect(source).toContain('hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}');
    expect(source).toContain('accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}');
  });
});
