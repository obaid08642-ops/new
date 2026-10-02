const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
// The design system lives in <repo>/packages and is imported by the app
// (12.A1 logo, then 12.A7 components). Metro only watches the project folder
// by default, so the workspace root is added here — without it a file outside
// patient-app is invisible to the bundler and `expo export` fails even though
// `tsc` passes.
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// The packages must not resolve their dependencies by walking up into a
// different node_modules than the app's.
config.resolver.disableHierarchicalLookup = true;

config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];
config.resolver.assetExts = [...config.resolver.assetExts, 'ttf', 'wav', 'mp3'];

// Audit-only (tools/live/rnweb): browser test builds keep the session in localStorage, because
// expo-secure-store has no web implementation. Inactive unless NABD_WEB_TEST=1.
if (process.env.NABD_WEB_TEST === '1') {
  const shim = path.resolve(__dirname, '../tools/live/rnweb/secure-store-web.js');
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (ctx, name, platform) => {
    if (platform === 'web' && name === 'expo-secure-store') return { type: 'sourceFile', filePath: shim };
    return upstream ? upstream(ctx, name, platform) : ctx.resolveRequest(ctx, name, platform);
  };
}

module.exports = config;
