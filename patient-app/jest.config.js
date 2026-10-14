module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@reduxjs/toolkit|immer|redux|redux-toolkit|react-redux)'
  ],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleNameMapper: {
    '@react-native-async-storage/async-storage': '@react-native-async-storage/async-storage/jest/async-storage-mock',

    // ONE React, ONE react-native, for the whole module graph.
    //
    // packages/ui-native carries react/react-native/react-native-svg as
    // DEVdependencies so its own `tsc` can typecheck them, which means
    // packages/ui-native/node_modules holds a SECOND copy of React. The nearest
    // node_modules wins, so phosphor-react-native (resolved from there) picked up
    // that second copy while react-test-renderer used the app's — and React's
    // hook dispatcher is per-copy, so every hook call blew up with "Invalid hook
    // call". Forcing all of them to the app's copies is what a peer dependency
    // means in practice, and it is why the app's copy has to be the one that runs.
    '^react$': '<rootDir>/node_modules/react',
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
    '^react-native$': '<rootDir>/node_modules/react-native',
    '^react-native/(.*)$': '<rootDir>/node_modules/react-native/$1',
    '^react-native-svg$': '<rootDir>/node_modules/react-native-svg',
    // Same rule for the safe-area context: the shells (packages/ui-native/src/shells) and the
    // app must share one provider, or the shells read the default zero insets.
    '^react-native-safe-area-context$': '<rootDir>/node_modules/react-native-safe-area-context',
  },
  // packages/ui-native is a source-only workspace with no install of its own, so
  // its `import 'react'` / babel-runtime helpers cannot be found by walking up
  // from packages/. modulePaths adds this app's node_modules as an absolute
  // resolution root, which is what lets the shared component run under jest
  // without a phantom node_modules in the package.
  modulePaths: ['<rootDir>/node_modules'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
