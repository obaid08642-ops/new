// Reviewer-written acceptance tests (HANDOFF §2): outside the default test run until the item is approved.
// Run: npx jest -c jest.acceptance.config.js acceptance/<id>
const base = require('./jest.config');

module.exports = { ...base, testMatch: ['<rootDir>/acceptance/**/*.acceptance.test.ts?(x)'] };
