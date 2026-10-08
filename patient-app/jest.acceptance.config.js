// Reviewer-written acceptance tests (HANDOFF §2): outside the default test run until the item is approved. Files are named *.acceptance.ts(x) (no .test) so the default jest.config testMatch never picks them up.
// Run: npx jest -c jest.acceptance.config.js acceptance/<id>
const base = require('./jest.config');

module.exports = { ...base, testMatch: ['<rootDir>/acceptance/**/*.acceptance.ts?(x)'] };
