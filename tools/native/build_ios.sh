#!/usr/bin/env bash
# Build patient-app or provider-app for the iOS Simulator, unsigned (CI only, macOS runner).
#   bash tools/native/build_ios.sh patient-app|provider-app   -> /tmp/native/<app>.app.zip
# Test-build-only changes, applied to the CI checkout and never committed (same idea as build_android.sh):
#  - the app talks to the local test backend (http://127.0.0.1:8002; the simulator shares the host network), so App Transport
#    Security is opened for local networking in the generated Info.plist;
#  - the Google services plist is dropped (it is not in the repository), so push is not part of this run;
#  - no signing: CODE_SIGNING_ALLOWED=NO, simulator SDK only (arm64 on the Apple-silicon runner).
set -euo pipefail
APP="$1"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/$APP"
mkdir -p /tmp/native

node -e '
const fs=require("fs"); const j=JSON.parse(fs.readFileSync("app.json","utf8"));
if (j.expo.android) delete j.expo.android.googleServicesFile; if (j.expo.ios) delete j.expo.ios.googleServicesFile;
fs.writeFileSync("app.json", JSON.stringify(j,null,2));'

export EXPO_PUBLIC_API_URL=http://127.0.0.1:8002
export EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8002/api/v1
export EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:8002
export EXPO_PUBLIC_SOCKET_URL=ws://127.0.0.1:8002
export EXPO_PUBLIC_APP_ENV=development
export SENTRY_DISABLE_AUTO_UPLOAD=true
npm ci --no-audit --no-fund --legacy-peer-deps
export NODE_ENV=production   # after the install: npm must not drop devDependencies (Metro resolves some of them)
npx expo prebuild -p ios --clean --no-install

cd ios
PLIST=$(ls -d */Info.plist | head -1)
/usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity dict" "$PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity:NSAllowsLocalNetworking bool true" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :NSAppTransportSecurity:NSAllowsLocalNetworking true" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity:NSAllowsArbitraryLoads bool true" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :NSAppTransportSecurity:NSAllowsArbitraryLoads true" "$PLIST"

pod install --repo-update
WS=$(ls -d *.xcworkspace | head -1); SCHEME="${WS%.xcworkspace}"
xcodebuild -workspace "$WS" -scheme "$SCHEME" -configuration Release -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/native/dd \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" ONLY_ACTIVE_ARCH=YES build | tail -n 40

BUILT=$(ls -d /tmp/native/dd/Build/Products/Release-iphonesimulator/*.app | head -1)
(cd "$(dirname "$BUILT")" && ditto -c -k --sequesterRsrc --keepParent "$(basename "$BUILT")" "/tmp/native/$APP.app.zip")
ls -la "/tmp/native/$APP.app.zip"
