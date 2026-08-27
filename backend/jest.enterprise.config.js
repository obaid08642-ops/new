/**
 * Dedicated integration configuration for enterprise admin contracts.
 * The main Jest configuration deliberately scopes fast unit tests to src/.
 */
module.exports = {
  rootDir: '.',
  testRegex: 'test/a-enterprise\\.integration\\.e2e-spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  testTimeout: 300000,
};
