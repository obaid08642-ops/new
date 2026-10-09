# D-31 acceptance (double taps and bad networks)

Reviewer-written; the implementing agent makes these pass and may not edit them.

- Web unit (real components, jsdom + react-dom client, only `fetch` / `navigator.onLine` faked):
  `cd patient-web && npx vitest run --config vitest.acceptance.config.ts acceptance/d-31`
- Web throttled 3G + offline/online flip (real `next dev` + Chromium, fake backend on a local port):
  `cd patient-web && node --experimental-strip-types acceptance/d-31/slow-network.e2e.ts`
  (uses `/opt/node-tools/node_modules/playwright` and `/opt/pw-browsers/chromium`; override with `PLAYWRIGHT_LIB` / `CHROMIUM_PATH`; port `D31_WEB_PORT`, default 3931; `D31_DEBUG=1` prints the request log; exit 0 = pass, 1 = a rule failed, 2 = setup failed)
- App unit: `cd patient-app && npx jest -c jest.acceptance.config.js acceptance/d-31`
