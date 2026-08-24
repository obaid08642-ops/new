'use strict';

// jest-expo exposes `fetch` through a lazy Expo native-module getter. In Node/Jest
// that getter can resolve asynchronously after a test environment is torn down.
// Unit tests provide their own response mocks; this stable default prevents native
// module initialization and turns an unconfigured request into a clear test error.
Object.defineProperty(global, 'fetch', {
  configurable: true,
  writable: true,
  value: jest.fn(async () => {
    throw new Error('Unmocked fetch in test');
  }),
});
