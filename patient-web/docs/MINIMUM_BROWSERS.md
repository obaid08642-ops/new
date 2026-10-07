# Minimum browsers and devices — patient-web (P15.10)

patient-web is the website itself, so "pointing to the website" reads here as:
never serve a silently broken app to a browser that cannot run it — show the
old-browser notice (`components-next/old-browser-notice.tsx`) instead.

## Floors

| Platform | Minimum | Why |
|---|---|---|
| iOS (Safari and every other iOS browser — all WebKit) | iOS **16.4+** | Plan floor; the OS version is the engine version |
| Android OS | **7+** | Plan floor (Expo SDK 57 era) |
| Chrome on Android / desktop, Edge | **109+** | Early-2023 Baseline, era-matched to the OS floors |
| Samsung Internet | **20+** | Chromium 109-based, era-matched |
| Firefox (desktop and Android) | **109+** | Era-matched |
| Safari on macOS | **16.4+** | Same WebKit era as iOS 16.4 |

Enforced in code by `lib/device-support.ts` (`isSupportedBrowser`); unknown,
empty, and bot user-agents PASS (fail open — crawlers and future browsers are
never locked out).

## What is NOT here

- **Device-farm report per release**: `BLOCKED: device farm is a paid external
  service with no account configured` — Firebase Test Lab / BrowserStack / AWS
  Device Farm cannot run from this worktree.
- **Playwright WebKit/Firefox/Chromium matrix in CI**: `.github/` workflows
  belong to another agent. Needed change, stated for them:
  `DEFERRED-OUT-OF-SCOPE: .github/ is owned by another agent` — add a
  `playwright.yml` workflow running the web suite on WebKit (Safari iOS 16+
  equivalent), Firefox, and Chromium, plus a Samsung Internet user-agent pass
  on Chromium, gating releases.
