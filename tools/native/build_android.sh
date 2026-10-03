#!/usr/bin/env bash
# Build a release APK of patient-app or provider-app for the Android emulator (CI only).
#   bash tools/native/build_android.sh patient-app|provider-app   -> /tmp/native/<app>.apk
# Test-build-only changes, applied to the CI checkout and never committed:
#  - the app talks to the local test backend (http://10.0.2.2:8002), so cleartext HTTP is allowed in the
#    generated AndroidManifest;
#  - patient-app's app.json points at google-services.json, which is not in the repository (the real file
#    is provided to store builds); it is dropped here, so FCM push is not part of this run;
#  - only the emulator ABI (x86_64) is compiled.
set -euo pipefail
APP="$1"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/$APP"
mkdir -p /tmp/native

node -e '
const fs=require("fs"); const j=JSON.parse(fs.readFileSync("app.json","utf8")); const a=j.expo.android||{};
delete a.googleServicesFile; if (j.expo.ios) delete j.expo.ios.googleServicesFile;
fs.writeFileSync("app.json", JSON.stringify(j,null,2));'

export EXPO_PUBLIC_API_URL=http://10.0.2.2:8002
export EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8002/api/v1
export EXPO_PUBLIC_BACKEND_URL=http://10.0.2.2:8002
export EXPO_PUBLIC_SOCKET_URL=ws://10.0.2.2:8002
export EXPO_PUBLIC_APP_ENV=development
export SENTRY_DISABLE_AUTO_UPLOAD=true
# provider-app has no .npmrc and its test-only devDependency react-test-renderer@^19.2.8 conflicts with the
# pinned react 19.2.3, so a plain `npm ci` fails (Q58). patient-app already sets legacy-peer-deps in .npmrc.
npm ci --no-audit --no-fund --legacy-peer-deps
# Q62: libraries that still call jcenter(), removed in Gradle 9 (the Gradle of Expo 57 / RN 0.86); the
# store build fails on them. Test build only: point them at mavenCentral() and list them as evidence.
JC=$(grep -l "jcenter()" node_modules/*/android/build.gradle node_modules/@*/*/android/build.gradle 2>/dev/null || true)
echo "jcenter() users: ${JC:-none}" | tee /tmp/native/jcenter_${APP}.txt
[ -n "$JC" ] && sed -i 's/jcenter()/mavenCentral()/g' $JC
# Q62: react-native-callkeep 3.1.x also uses androidx LocalBroadcastManager without declaring it.
CK=node_modules/react-native-callkeep/android/build.gradle
if [ -f "$CK" ] && ! grep -q localbroadcastmanager "$CK"; then
  sed -i '0,/^dependencies *{/s//dependencies {\n    implementation "androidx.localbroadcastmanager:localbroadcastmanager:1.1.0"/' "$CK"
  echo "callkeep: added androidx.localbroadcastmanager (test build only)" | tee -a /tmp/native/jcenter_${APP}.txt
fi
export NODE_ENV=production   # after the install: npm must not drop devDependencies (Metro resolves some of them)
npx expo prebuild -p android --clean --no-install

MAN=android/app/src/main/AndroidManifest.xml
sed -i 's/android:usesCleartextTraffic="[a-z]*"//' "$MAN"
sed -i '0,/<application /s//<application android:usesCleartextTraffic="true" /' "$MAN"
grep -o 'usesCleartextTraffic="true"' "$MAN"

cd android
./gradlew --no-daemon assembleRelease -PreactNativeArchitectures=x86_64 -Dorg.gradle.jvmargs="-Xmx6g -XX:MaxMetaspaceSize=1g"
cp app/build/outputs/apk/release/app-release.apk "/tmp/native/$APP.apk"
ls -la "/tmp/native/$APP.apk"
