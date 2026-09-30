#!/usr/bin/env node
/**
 * Render the illustrated icon set (12.A6) out of `icons/illustrated.ts` so it
 * can be eyeballed and exported: one SVG per icon, one preview sheet per theme,
 * plus a PNG of the sheet.
 *
 * Why generate instead of hand-writing nine SVGs: the geometry lives in exactly
 * one place (the canvas transcription), and the web + React Native renderers
 * read the same data. A generated sheet is what a reviewer actually looks at.
 *
 * Usage: node packages/ui/build-icons.mjs [--check]
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, 'dist', 'icons');
const CHECK_ONLY = process.argv.includes('--check');

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
    /* next location */
  }
}

// The source is TypeScript, so strip the types the way Node 24 does natively.
const { ILLUSTRATED, ILLUSTRATED_ICONS, assertArtworkIsPaletteBound } = await import(
  join(HERE, 'icons', 'illustrated.ts')
);

/* ------------------------------------------------- the palette, from tokens */

const tokens = JSON.parse(
  readFileSync(join(HERE, '..', 'design-tokens', 'tokens.json'), 'utf8'),
);
const ART = tokens.color.iconArt;

/** Artwork colours come from the tokens, never from a hex in this file. */
const paint = (key) => {
  const value = ART[key];
  if (typeof value !== 'string') {
    throw new Error(`color.iconArt.${key} is missing from tokens.json`);
  }
  return value;
};

/* -------------------------------------------------------------- SVG output */

/**
 * The preview sheet is rendered by librsvg on whatever machine runs the build,
 * which does not have Readex Pro. Naming the system Arabic-capable faces keeps
 * the sheet legible for review; the apps themselves use Readex Pro via the
 * token stack, so nothing here leaks into the product.
 */
const PREVIEW_FONT =
  "'Readex Pro', 'Geeza Pro', 'Noto Sans Arabic', 'Baghdad', 'Al Bayan', 'Damascus', 'Arial Unicode MS', system-ui, sans-serif";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function primToSvg(prim) {
  const common = (extra = {}) => {
    const parts = [];
    if (extra.fill && extra.fill !== 'none') parts.push(`fill="${paint(extra.fill)}"`);
    else parts.push('fill="none"');
    if (extra.stroke) parts.push(`stroke="${paint(extra.stroke)}"`);
    if (extra.strokeWidth !== undefined) parts.push(`stroke-width="${extra.strokeWidth}"`);
    if (extra.opacity !== undefined) parts.push(`opacity="${extra.opacity}"`);
    parts.push('stroke-linecap="round"', 'stroke-linejoin="round"');
    return parts.join(' ');
  };

  if (prim.el === 'g') {
    const [angle, cx, cy] = prim.rotate ?? [0, 0, 0];
    return `<g transform="rotate(${angle} ${cx} ${cy})">${prim.children.map(primToSvg).join('')}</g>`;
  }
  if (prim.el === 'path') return `<path d="${esc(prim.d)}" ${common(prim)}/>`;
  if (prim.el === 'circle') {
    return `<circle cx="${prim.cx}" cy="${prim.cy}" r="${prim.r}" ${common(prim)}/>`;
  }
  return `<rect x="${prim.x}" y="${prim.y}" width="${prim.w}" height="${prim.h}" rx="${prim.rx}" ${common(prim)}/>`;
}

const svgFor = (name) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="${name}">\n` +
  `  <title>${name}</title>\n` +
  `  ${ILLUSTRATED[name].map(primToSvg).join('\n  ')}\n` +
  `</svg>\n`;

/* ------------------------------------------------------------ preview sheet */

const LABELS = {
  ar: {
    pharmacy: 'الصيدلية', consult: 'استشارة', lab: 'تحاليل', radiology: 'أشعة',
    nursing: 'تمريض منزلي', mind: 'صحة نفسية', nutrition: 'تغذية', family: 'العائلة', doctor: 'الطبيب',
  },
  en: {
    pharmacy: 'Pharmacy', consult: 'Consultation', lab: 'Labs', radiology: 'Radiology',
    nursing: 'Home nursing', mind: 'Mental health', nutrition: 'Nutrition', family: 'Family', doctor: 'Doctor',
  },
};

/** The sheet reproduces the canvas: white tiles on light, #12263A on dark. */
function sheet(theme, lang) {
  const light = theme === 'light';
  const bg = light ? tokens.color.bg.canvas.light : tokens.color.bg.canvas.dark;
  const tile = light ? tokens.color.bg.surface.light : tokens.color.bg.surface.dark;
  const tileBorder = light ? tokens.color.border.hairline.light : tokens.color.border.hairline.dark;
  const shadow = light ? tokens.shadow.tile.light : tokens.shadow.tile.dark;
  const ink = light ? tokens.color.text.primary.light : tokens.color.text.primary.dark;
  const labels = LABELS[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const cards = ILLUSTRATED_ICONS.map((name, i) => {
    const x = 40 + i * 152;
    return [
      `<g transform="translate(${x} 96)">`,
      `  <rect width="128" height="128" rx="28" fill="${tile}" stroke="${tileBorder}" filter="url(#s)"/>`,
      `  <g transform="translate(24 24) scale(1.6667)">${ILLUSTRATED[name].map(primToSvg).join('')}</g>`,
      `  <text x="64" y="164" text-anchor="middle" font-family="${PREVIEW_FONT}" font-size="14" font-weight="500" fill="${ink}">${esc(labels[name])}</text>`,
      `</g>`,
    ].join('\n');
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${40 + ILLUSTRATED_ICONS.length * 152} 232" width="${40 + ILLUSTRATED_ICONS.length * 152}" height="232" dir="${dir}">
  <title>Nabd+ illustrated icon set — ${theme} theme, ${lang} labels</title>
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0B1B2B" flood-opacity="${light ? '0.07' : '0.25'}"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
${cards}
</svg>
`;
}

/* ------------------------------------------------------------------- main */

const offenders = assertArtworkIsPaletteBound();
if (offenders.length) {
  console.error('illustrated icons: a colour is not a color.iconArt key —');
  for (const o of offenders) console.error(`  ${o}`);
  process.exit(1);
}

mkdirSync(DIST, { recursive: true });
const outputs = {
  ...Object.fromEntries(ILLUSTRATED_ICONS.map((n) => [`${n}.svg`, svgFor(n)])),
  // English labels in both sheets. The icons carry NO label: in the product the
  // label is app text from i18n next to the icon, so it is localisable and
  // readable by a screen reader. The sheet labels exist only to identify an
  // icon during review, and the PNG rasteriser on a build machine has no
  // Arabic-capable font, so English is what renders there.
  'sheet-light.svg': sheet('light', 'en'),
  'sheet-dark.svg': sheet('dark', 'en'),
};

const drift = [];
for (const [name, body] of Object.entries(outputs)) {
  const target = join(DIST, name);
  if (CHECK_ONLY) {
    if (!existsSync(target) || readFileSync(target, 'utf8') !== body) {
      drift.push(name);
    }
    continue;
  }
  writeFileSync(target, body, 'utf8');
}

if (sharp) {
  for (const theme of ['light', 'dark']) {
    const png = await sharp(Buffer.from(outputs[`sheet-${theme}.svg`]), { density: 96 })
      .png()
      .toBuffer();
    const target = join(DIST, `sheet-${theme}.png`);
    if (CHECK_ONLY) {
      if (!existsSync(target) || !readFileSync(target).equals(png)) drift.push(`sheet-${theme}.png`);
    } else {
      writeFileSync(target, png);
    }
  }
}

if (drift.length) {
  console.error(`illustrated icons: out of date -> ${drift.join(', ')}. Run: node packages/ui/build-icons.mjs`);
  process.exit(1);
}

console.log(
  CHECK_ONLY
    ? `illustrated icons: ${Object.keys(outputs).length} SVGs are up to date.`
    : `illustrated icons: wrote ${ILLUSTRATED_ICONS.length} icons + 2 preview sheets from one geometry.`,
);
