// Same preset Metro applies by default when no config exists; written out so Jest (babel-jest via jest-expo)
// can transform JSX/TS/ESM for component tests. Do not add the Reanimated/Worklets plugin by hand:
// babel-preset-expo configures it.
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
