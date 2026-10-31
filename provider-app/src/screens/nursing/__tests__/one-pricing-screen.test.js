const fs = require('fs');
const path = require('path');

/** Nursing has ONE place for services and prices (My services and prices); the old "Pricing Model" delta screen is gone. */
describe('nursing settings: one pricing screen', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../NursingDashboard.tsx'), 'utf8');
  it('opens My services and prices and has no second pricing route or screen', () => {
    expect(source).toContain("vertical=\"nursing\"");
    expect(source).toContain("onNav('nursing_services')");
    expect(source).not.toContain('nursing_pricing');
    expect(source).not.toContain('NursingPricingSettings');
    expect(source).not.toContain('hourlyEnabled');
  });
});
