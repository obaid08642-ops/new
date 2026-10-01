#!/usr/bin/env node
/**
 * 12.A1 — the Open Graph / share-card generator.
 *
 * `patient-web/public/images/og-default.jpg` was a 129 KB binary committed by
 * hand with nothing that could regenerate it. A share image is the one place a
 * product is most visible and least controlled: it is what appears when someone
 * pastes a link into WhatsApp or X, and it had drifted from the brand with no
 * mechanism that could notice.
 *
 * So it is generated from the same `packages/brand/src/logo-mark-onbrand.svg`
 * that the app icons, the favicon and the splash are generated from, with the
 * colours and the type read out of `tokens.json`. There is now no second copy of
 * the brand to keep in step: change the mark or the palette and `--check` fails
 * until the card is rebuilt.
 *
 *   node tools/design/og-image.mjs           # rebuild
 *   node tools/design/og-image.mjs --check   # fail if the committed file is stale
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(REPO, 'patient-web/public/images/og-default.png');
const CHECK = process.argv.includes('--check');
const W = 1200;
const H = 630;

const tokens = JSON.parse(readFileSync(join(REPO, 'packages/design-tokens/tokens.json'), 'utf8'));
const mark = readFileSync(join(REPO, 'packages/brand/src/logo-mark-onbrand.svg'), 'utf8').trim();

const brand = tokens.color.brand;
const ink = brand.ink.light ?? brand.ink;
const canvas = tokens.color.bg.canvas.light;
const textPrimary = tokens.color.text.primary.light;
const textSecondary = tokens.color.text.secondary.light;

// The wordmark is real text, so it is set in Readex Pro — the family the brand
// actually ships (A5) — rather than a system fallback that would render the
// Arabic wordmark in whatever the render host happens to prefer.
const FONT = join(REPO, 'patient-app/assets/fonts');

// Wordmark type comes from the token source, not from a hard-coded string here.
const arStack = tokens.font?.arabic?.stack ?? tokens.type?.fontFamily?.ar ?? '"Readex Pro", system-ui, sans-serif';
const latinStack = tokens.font?.latin?.stack ?? tokens.type?.fontFamily?.en ?? 'system-ui, sans-serif';

/** Inline the mark's inner geometry; the outer <svg> becomes our <img>-less markup. */
function inlineMark(size) {
  const inner = mark.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg viewBox="0 0 240 240" width="${size}" height="${size}" aria-hidden="true">${inner}</svg>`;
}

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face{font-family:Readex;src:url(file://${FONT}/ReadexPro-400.ttf) format('truetype');font-weight:400;font-display:block}
  @font-face{font-family:Readex;src:url(file://${FONT}/ReadexPro-700.ttf) format('truetype');font-weight:700;font-display:block}
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${W}px;height:${H}px;overflow:hidden;background:${canvas};color:${textPrimary};
       font-family:Readex,${arStack};display:flex;flex-direction:column;justify-content:space-between;padding:72px 80px}
  .row{display:flex;align-items:center;gap:28px}
  /* The mark is the "on brand" variant — white — so it needs the brand-filled
     tile behind it, exactly like the app icon and the app header. Dropped
     straight onto the light canvas it was white-on-near-white and effectively
     invisible: the first render of this card came out with a wordmark floating
     in space and no logo at all. */
  .tile{width:132px;height:132px;border-radius:34px;background:${ink};
        display:flex;align-items:center;justify-content:center}
  .word{font-size:74px;font-weight:700;letter-spacing:-.02em;line-height:1}
  .plus{color:${brand.coral.light}}
  .tag{font-size:31px;color:${textSecondary};line-height:1.45;max-width:840px;font-weight:400}
  .foot{display:flex;align-items:center;gap:14px;font-size:24px;color:${textSecondary};font-family:${latinStack}}
  .bar{width:64px;height:6px;border-radius:3px;background:${brand.coral.light}}
</style></head>
<body>
  <div class="row">
    <div class="tile">${inlineMark(96)}</div>
    <div class="word">نبض<span class="plus">+</span></div>
  </div>
  <div class="tag">احجز الموعد المناسب، تابع خطة العلاج، وابقَ على اتصال&nbsp;— من مكان واحد.</div>
  <div class="foot"><span class="bar"></span><span>Nabd&nbsp;+&nbsp;Heart&nbsp;Health&nbsp;Platform</span></div>
</body></html>`;

const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/**
 * Rendered with the Chrome that is on the machine, not with a browser-automation
 * dependency. This script has to run in CI and on a designer's laptop without
 * either of them installing a 300 MB node package to produce one JPEG, and the
 * card is a fixed 1200x630 with no interaction — which is exactly the case a
 * headless browser shell covers perfectly.
 *
 * Chrome's `--screenshot` only writes PNG, so the artefact is a PNG. That is not
 * a downgrade: every consumer (WhatsApp, X, Slack, LinkedIn) handles PNG, and
 * losing the lossy encoder is the better trade for flat brand colour.
 */
const TMP = join(dirname(OUT), '.og-default.tmp.png');
const PAGE = join(dirname(fileURLToPath(import.meta.url)), '.og-image.html');
rmSync(TMP, { force: true });

// Written next to this script rather than passed as a data: URL: file:// pages
// are allowed to read sibling files, and the card needs the Readex .ttf from
// disk, which a data: URL cannot reach.
writeFileSync(PAGE, html);

execFileSync(
  CHROME,
  [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${W},${H}`,
    `--screenshot=${TMP}`,
    `file://${PAGE}`,
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

if (!existsSync(TMP)) {
  console.error(`og-image: FAILED — Chrome wrote nothing. Is a Chrome at ${CHROME}?`);
  process.exit(1);
}
const next = readFileSync(TMP);
rmSync(TMP, { force: true });

if (next.length < 5000) {
  // A blank or half-painted card still produces a valid PNG. Size is the cheap
  // proxy for "something was actually drawn on it".
  console.error(`og-image: FAILED — the card rendered to only ${next.length} B, which is a blank image.`);
  process.exit(1);
}

if (CHECK) {
  if (!existsSync(OUT)) {
    console.error('og-image: FAILED — the share card is missing. Run `node tools/design/og-image.mjs`.');
    process.exit(1);
  }
  const current = readFileSync(OUT);
  if (!current.equals(next)) {
    console.error(
      `og-image: FAILED — the committed share card is stale (${current.length} B on disk, ${next.length} B rebuilt).\n` +
        '  The mark or the palette moved and the card did not follow.\n' +
        '  Run `node tools/design/og-image.mjs`.',
    );
    process.exit(1);
  }
  console.log(`og-image: the share card is up to date (${current.length} B, ${W}x${H}).`);
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, next);
  // The hand-committed JPEG had no generator and could not be kept in step with
  // the mark; it is removed rather than left as a second, drifting copy.
  rmSync(join(REPO, 'patient-web/public/images/og-default.jpg'), { force: true });
  console.log(`og-image: wrote ${OUT} (${next.length} B, ${W}x${H}) from the A1 mark + tokens.`);
}
