// Acceptance tests written by the reviewer BEFORE an item is implemented
// (HANDOFF §2, owner decision 2026-10-05). They describe the required behaviour
// and fail until the item is done; the implementing agent makes them pass and
// may not edit them. They live outside src/ so the unit gate stays green while
// an item is open; scripts/run-acceptance.mjs runs one item, or every item
// listed in acceptance/DONE once the reviewer has approved it.
module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/acceptance'],
  testRegex: '\\.acceptance\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
};
