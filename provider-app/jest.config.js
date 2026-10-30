// jest-expo preset (matches Expo SDK 58) so component tests can render with @testing-library/react-native.
const path = require('path');

// RN 0.88 publishes these subpaths through its package `exports` map only; Jest 30 does not read it, so they are mapped to the files.
const rn = (file) => path.join(__dirname, 'node_modules/react-native', file);

module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@livekit/.*|livekit-client|@testing-library/.*|react-native-svg)',
  ],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^react-native/react-private-interface$': rn('src/react-private-interface.js'),
    '^react-native/setup-env$': rn('src/setup-env.js'),
    '@react-native-async-storage/async-storage': '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
};
