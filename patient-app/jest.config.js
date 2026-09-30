module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@reduxjs/toolkit|immer|redux|redux-toolkit|react-redux)'
  ],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleNameMapper: {
    '@react-native-async-storage/async-storage': '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
  // packages/ui-native is a source-only workspace with no install of its own, so
  // its `import 'react'` / babel-runtime helpers cannot be found by walking up
  // from packages/. modulePaths adds this app's node_modules as an absolute
  // resolution root, which is what lets the shared component run under jest
  // without a phantom node_modules in the package.
  modulePaths: ['<rootDir>/node_modules'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
