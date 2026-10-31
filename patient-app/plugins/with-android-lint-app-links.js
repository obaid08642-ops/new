// Android lint crashes while checking the app's many https intent-filter <data> entries (app.json android.intentFilters):
//   IllegalArgumentException "Comparison method violates its general contract" in AppLinksValidDetector.handleIntentFilterInActivity,
// which fails `lintVitalAnalyzeRelease` and with it every release build (assembleRelease, bundleRelease). Only the detectors the
// crash message names are turned off; every other lint check stays on.
const { withAppBuildGradle } = require('expo/config-plugins');

const DISABLED = ['AppLinkWarning', 'AppLinkSplitToWebAndCustom', 'IntentFilterUniqueDataAttributes', 'TestAppLink', 'AppLinkUriRelativeFilterGroupError', 'AppLinkUrlError'];
const MARKER = '// with-android-lint-app-links';

module.exports = function withAndroidLintAppLinks(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += `\n${MARKER}\nandroid {\n    lint {\n        disable ${DISABLED.map((d) => `"${d}"`).join(', ')}\n    }\n}\n`;
    }
    return cfg;
  });
};
