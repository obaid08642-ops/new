import { isolateNumbers } from '../src/utils/bidi';

// Needs-review issue 671: a phone number keeps its + at the start inside an Arabic row.
describe('isolateNumbers', () => {
  it('wraps a phone-like run in a left-to-right isolate', () => {
    expect(isolateNumbers('أمي · +966 50 123 4567')).toBe('أمي · ⁦+966 50 123 4567⁩');
  });
  it('leaves short numbers and plain text alone', () => {
    expect(isolateNumbers('3 أدوية')).toBe('3 أدوية');
  });
});
