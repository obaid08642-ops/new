// @react-native-firebase/app pulls in FirebaseCoreInternal (Swift), which depends on GoogleUtilities (no module map). With static
// libraries CocoaPods then refuses to install ("The Swift pod FirebaseCoreInternal depends upon GoogleUtilities, which does not define
// modules"). Its own message names the fix: use_modular_headers! in the Podfile. Added once, before the first target.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const LINE = 'use_modular_headers!';

module.exports = function withIosModularHeaders(config) {
  return withDangerousMod(config, ['ios', (cfg) => {
    const file = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
    const podfile = fs.readFileSync(file, 'utf8');
    if (!podfile.includes(LINE)) {
      const at = podfile.search(/^target\s/m);
      fs.writeFileSync(file, at < 0 ? `${LINE}\n${podfile}` : `${podfile.slice(0, at)}${LINE}\n\n${podfile.slice(at)}`);
    }
    return cfg;
  }]);
};
