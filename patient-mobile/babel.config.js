module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo (SDK 54) automatically configures the Reanimated /
    // Worklets Babel plugin. Do NOT add 'react-native-reanimated/plugin' or
    // 'react-native-worklets/plugin' manually — doing so causes:
    //   "Cannot find module 'react-native-worklets/plugin'"  (v3 path on v4)
    // or a duplicate-plugin error. The preset handles it.
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@/design-system': './src/design-system',
            '@/theme':         './src/theme',
            '@/components':    './src/components',
            '@/hooks':         './src/hooks',
            '@/store':         './src/store',
            '@/services':      './src/services',
            '@/utils':         './src/utils',
            '@/types':         './src/types',
            '@/constants':     './src/constants',
            '@/context':       './src/context',
            '@/i18n':          './src/i18n',
            '@/guided-tour':   './src/guided-tour',
            '@/assets':        './assets',
            '@':               './src',
          },
        },
      ],
      ...(process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production'
        ? ['transform-remove-console']
        : []),
    ],
  };
};
