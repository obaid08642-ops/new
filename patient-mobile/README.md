# نبض بلس (Nabdah Plus) — Healthcare Super-App

## Expo SDK 54 — Production Ready

### Quick Start

```bash
# 1. Unzip & enter project
unzip nabdah-plus-SDK54-FIXED.zip && cd nabdah-plus

# 2. Install (MUST use legacy-peer-deps)
npm install --legacy-peer-deps

# 3. Fix any remaining version mismatches
npx expo install --fix

# 4. Start
npx expo start
```

**Then scan the QR code with Expo Go on your iPhone** — Expo Go supports SDK 54 ✅

---

### 🔑 Root Cause Fixed: `react-native-worklets/plugin`

The error `Cannot find module 'react-native-worklets/plugin'` was caused by:
- `react-native-reanimated: ~3.17.4` in package.json (SDK 55 version)
- Reanimated 3.17.x requires `react-native-worklets-core` (not installed)
- SDK 54 ships with Reanimated **3.16.x** which does NOT need worklets

**Fixed by pinning to `react-native-reanimated: ~3.16.7`**

### 📦 Correct SDK 54 Versions

| Package | Correct Version |
|---------|----------------|
| `expo` | `~54.0.17` |
| `react` | `18.3.1` ← NOT React 19 |
| `react-native` | `0.76.9` ← NOT 0.79 |
| `expo-router` | `~4.0.20` ← v4 NOT v5 |
| `react-native-reanimated` | `~3.16.7` ← NOT 3.17.x |
| `react-native-safe-area-context` | `4.12.0` |
| `@types/react` | `~18.3.12` |
| `babel-preset-expo` | `~12.0.10` |

### ⚠️ Note on Cairo Fonts

The font files are structurally valid TTF stubs (640 bytes, 10 tables).
For production Arabic typography, replace with real Cairo fonts from:
**https://fonts.google.com/specimen/Cairo**

Replace files in `assets/fonts/`:
- Cairo-Regular.ttf
- Cairo-Medium.ttf
- Cairo-SemiBold.ttf
- Cairo-Bold.ttf
- Cairo-ExtraBold.ttf
- Cairo-Black.ttf

---

### 📱 141 Screens across 27 feature groups
