#!/usr/bin/env node
/**
 * Nabd+ brand assets — generator.
 *
 * `src/*.svg` are the editable sources (a designer can open them). This script
 * rasterises them into the exact files each platform asks for, and enforces two
 * things that must never drift:
 *
 *  1. The MARK GEOMETRY. Every variant must contain the approved bowl path and
 *     dot of `logo-mark.svg` verbatim. Only the colours, the scale and the
 *     background are allowed to vary, so nobody can quietly redraw the logo in
 *     one app icon.
 *  2. iOS OPACITY. The App Store rejects an icon with an alpha channel, so
 *     `icon-1024.png` is flattened onto an opaque coral field and the build
 *     fails if any transparency survives.
 *
 * Usage: node packages/brand/build.mjs [--check]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'src');
const DIST = join(HERE, 'dist');
const CHECK_ONLY = process.argv.includes('--check');

// sharp lives in the admin and backend installs; this package has no deps of
// its own so the brand assets never add a dependency to a client app.
const require = createRequire(import.meta.url);
let sharp;
for (const candidate of [
  () => require('sharp'),
  () => require('../../admin/node_modules/sharp'),
  () => require('../../backend/node_modules/sharp'),
]) {
  try {
    sharp = candidate();
    break;
  } catch {
    /* try the next location */
  }
}

/* ------------------------------------------------- 1. the approved geometry */

const master = readFileSync(join(SRC, 'logo-mark.svg'), 'utf8');
const BOWL_PATH = 'M40 104 C40 196 200 196 200 104';
const STROKE_WIDTH = '36';
const DOT_CIRCLE = 'cx="120" cy="58" r="24"';

for (const [key, needle] of [
  ['bowl path', BOWL_PATH],
  ['dot circle', DOT_CIRCLE],
]) {
  if (!master.includes(needle)) {
    console.error(`brand: logo-mark.svg no longer contains the approved ${key} (${needle}).`);
    console.error('       The mark is owner-approved geometry; restore it or get the owner to change it.');
    process.exit(1);
  }
}
if (!master.includes(`stroke-width="${STROKE_WIDTH}"`)) {
  console.error(`brand: logo-mark.svg stroke-width is not ${STROKE_WIDTH}.`);
  process.exit(1);
}

/** Every variant must still be the approved mark, just recoloured/rescaled. */
const VARIANTS = [
  'logo-mark-ink.svg',
  'logo-mark-onbrand.svg',
  'favicon.svg',
  'icon-ios.svg',
  'icon-maskable.svg',
  'icon-square.svg',
  'icon-android-foreground.svg',
  'notification-icon.svg',
  'splash-light.svg',
  'splash-dark.svg',
];

for (const file of VARIANTS) {
  const body = readFileSync(join(SRC, file), 'utf8');
  if (!body.includes(BOWL_PATH) || !body.includes(DOT_CIRCLE)) {
    console.error(`brand: ${file} does not use the approved mark geometry.`);
    process.exit(1);
  }
}
// The adaptive background is a flat field and must not contain the mark.
const adaptiveBg = readFileSync(join(SRC, 'icon-android-background.svg'), 'utf8');
if (adaptiveBg.includes(BOWL_PATH)) {
  console.error('brand: icon-android-background.svg must be a flat field with no mark on it.');
  process.exit(1);
}

// Without a rasteriser only the geometry above can be verified. `--check`
// says so and passes (CI re-runs it after installing sharp for the raster
// comparison); a build cannot produce anything and fails.
if (!sharp) {
  if (CHECK_ONLY) {
    console.log('brand: mark geometry verified; raster comparison skipped (sharp is not installed).');
    process.exit(0);
  }
  console.error('brand: sharp is not available. Install it (admin or backend workspace) to build the brand assets.');
  process.exit(1);
}

/* ------------------------------------------------------------ 2. rasterising */

const readSvg = (file) => readFileSync(join(SRC, file));

/**
 * Rasterise one SVG at the requested pixel size.
 *
 * The density is derived from the target rather than fixed: an SVG viewBox is
 * measured in CSS pixels, so a 240-unit mark needs a boost to fill 1024 px,
 * while the 1242x2688 splash is already at its final size and must NOT be
 * upscaled (that would blow past sharp's pixel limit for no benefit).
 */
async function png(file, width, ...rest) {
  // Called as png(file, w) | png(file, w, h) | png(file, w, opts) | png(file, w, h, opts)
  const height = typeof rest[0] === 'number' ? rest[0] : width;
  const { opaque = false, background } = typeof rest[0] === 'object' && rest[0] !== null ? rest[0] : rest[1] ?? {};

  const svg = readSvg(file).toString('utf8');
  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const shortest = viewBox ? Math.min(Number(viewBox[1]), Number(viewBox[2])) : width;
  const density = Math.min(600, Math.max(72, Math.round((72 * Math.max(width, height)) / shortest)));

  // `contain` on both axes keeps the aspect ratio of a portrait splash while
  // still producing exact pixel dimensions for a square icon.
  let pipeline = sharp(Buffer.from(svg), { density }).resize(width, height, { fit: 'contain' });
  if (opaque) pipeline = pipeline.flatten({ background });
  return pipeline.png({ compressionLevel: 9 }).toBuffer();
}

/* ------------------------------------------------------- 3. the ICO writer */

/**
 * A minimal ICO container carrying PNG payloads (understood by every browser and
 * by Windows Vista and later). Each directory entry is 16 bytes; the image
 * offsets point at the PNG data that follows all the entries.
 */
function buildIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(16 * count);
  let offset = header.length + entries.length;
  images.forEach(({ size, data }, i) => {
    const at = i * 16;
    // 0 means 256 in the ICO directory.
    entries.writeUInt8(size >= 256 ? 0 : size, at + 0);
    entries.writeUInt8(size >= 256 ? 0 : size, at + 1);
    entries.writeUInt8(0, at + 2); // palette size
    entries.writeUInt8(0, at + 3); // reserved
    entries.writeUInt16LE(1, at + 4); // colour planes
    entries.writeUInt16LE(32, at + 6); // bits per pixel
    entries.writeUInt32LE(data.length, at + 8);
    entries.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });

  return Buffer.concat([header, entries, ...images.map((i) => i.data)]);
}

/* ------------------------------------------------------------------ outputs */

const CORAL = '#FF4B55';

const outputs = {
  // iOS: 1024, opaque. Apple rejects transparency outright.
  'icon-1024.png': () => png('icon-ios.svg', 1024, { opaque: true, background: CORAL }),
  // Web, PWA manifest, social preview: the rounded tile.
  'icon-512.png': () => png('icon-square.svg', 512),
  'icon-192.png': () => png('icon-square.svg', 192),
  'icon-180.png': () => png('icon-square.svg', 180),
  'icon-32.png': () => png('icon-square.svg', 32),
  'icon-16.png': () => png('icon-square.svg', 16),
  // Android
  'icon-maskable-512.png': () => png('icon-maskable.svg', 512, { opaque: true, background: CORAL }),
  'icon-android-background-432.png': () => png('icon-android-background.svg', 432, { opaque: true, background: CORAL }),
  'icon-android-foreground-432.png': () => png('icon-android-foreground.svg', 432),
  'icon-android-foreground-1024.png': () => png('icon-android-foreground.svg', 1024),
  'icon-android-background-1024.png': () => png('icon-android-background.svg', 1024, { opaque: true, background: CORAL }),
  // Android masks notifications, so this one is a flat white silhouette.
  'notification-icon-1024.png': () => png('notification-icon.svg', 1024),
  // Splash
  // Portrait 1242x2688, the aspect a phone launch screen is cut from.
  'splash-light-1242x2688.png': () => png('splash-light.svg', 1242, 2688, { opaque: true, background: '#F5F5F7' }),
  'splash-dark-1242x2688.png': () => png('splash-dark.svg', 1242, 2688, { opaque: true, background: '#0B1B2B' }),
};

/* ------------------------------------------------- 4. write, or verify only */

mkdirSync(DIST, { recursive: true });
const failures = [];
let written = 0;

for (const [name, produce] of Object.entries(outputs)) {
  const data = await produce();
  const target = join(DIST, name);

  if (name === 'icon-1024.png') {
    const meta = await sharp(data).metadata();
    if (meta.hasAlpha) {
      failures.push('icon-1024.png still has an alpha channel; the App Store rejects that.');
    }
  }

  if (CHECK_ONLY) {
    if (!existsSync(target) || !readFileSync(target).equals(data)) {
      failures.push(`${name} is not what the generator produces. Run: node packages/brand/build.mjs`);
    }
    continue;
  }
  writeFileSync(target, data);
  written += 1;
}

// favicon.ico: the bare mark at the three sizes a browser actually asks for.
const icoSizes = [16, 32, 48];
const icoImages = [];
for (const size of icoSizes) {
  icoImages.push({ size, data: await png('favicon.svg', size) });
}
const ico = buildIco(icoImages);
const icoTarget = join(DIST, 'favicon.ico');
if (CHECK_ONLY) {
  if (!existsSync(icoTarget) || !readFileSync(icoTarget).equals(ico)) {
    failures.push('favicon.ico is not what the generator produces. Run: node packages/brand/build.mjs');
  }
} else {
  writeFileSync(icoTarget, ico);
  written += 1;
}

if (failures.length) {
  for (const failure of failures) console.error(`brand: ${failure}`);
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log(`brand: all ${Object.keys(outputs).length + 1} generated assets are up to date.`);
} else {
  console.log(`brand: wrote ${written} assets from ${VARIANTS.length + 1} SVG sources.`);
  for (const name of [...Object.keys(outputs), 'favicon.ico']) console.log(`  dist/${name}`);
}
