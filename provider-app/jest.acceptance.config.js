// Reviewer-written acceptance tests (HANDOFF §2): outside the default test run
// until the item is approved. Run: npx jest --config jest.acceptance.config.js acceptance/<id>
const base = require('./jest.config');
module.exports = { ...base, testMatch: ['<rootDir>/acceptance/**/*.acceptance.[jt]s?(x)'] };
