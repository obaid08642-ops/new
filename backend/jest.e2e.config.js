/**
 * Live staging E2E config — runs master-e2e-15-journeys + any *.e2e-spec.ts in test/
 * Usage: npx jest --config jest.e2e.config.js --runInBand
 * Alias for jest.boot.config.js to satisfy master-e2e task spec.
 */
module.exports = {
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  moduleNameMapper: {},
  testTimeout: 180000,
};
