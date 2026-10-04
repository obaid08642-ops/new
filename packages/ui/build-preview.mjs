#!/usr/bin/env node
/**
 * The preview page for the design stamps (12.A6/A7).
 *
 * A reviewer opens this file to see the system without booting anything:
 * every illustrated icon at real tile sizes, the line set, the type scale, the
 * surfaces, the status colours and the buttons — in BOTH themes side by side,
 * because a palette that only works in one theme is not a palette.
 *
 * It is generated, so it can never show a component that does not exist.
 *
 * Usage: node packages/ui/build-preview.mjs [--check]
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire, register } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, 'dist');
const CHECK_ONLY = process.argv.includes('--check');

const { ILLUSTRATED, ILLUSTRATED_ICONS, ICON_TINT, assertArtworkIsPaletteBound } = await import(
  join(HERE, 'icons', 'illustrated.ts')
);
const {
  ILLUSTRATIONS,
  ILLUSTRATION_META,
  ILLUSTRATION_NAMES,
  ILLUSTRATION_SECTIONS,
  GRID,
} = await import(join(HERE, 'icons', 'illustrations.ts'));
const fixtures = await import(join(HERE, 'components', 'fixtures.ts'));

// The gallery renders the REAL components, so a specimen cannot drift from what
// a screen gets. `tsx-loader.mjs` compiles them for Node's ESM loader, because
// Node strips TypeScript types but not JSX. If it cannot, the gallery degrades
// to the geometry-only view rather than failing the build — a missing
// devDependency should cost the reviewer a section, not the whole run.
register('./tsx-loader.mjs', import.meta.url);
const ui = await import(join(HERE, 'src', 'index.ts')).catch((err) => {
  console.warn('preview: components unavailable, showing geometry only —', err.message);
  return null;
});

const offenders = assertArtworkIsPaletteBound(ILLUSTRATED).concat(
  assertArtworkIsPaletteBound(ILLUSTRATIONS),
);
if (offenders.length) {
  console.error('preview: a colour is not a color.iconArt key —');
  offenders.forEach((o) => console.error(`  ${o}`));
  process.exit(1);
}

/**
 * The real line set, so the preview shows the icons the apps will render.
 *
 * Resolved from THIS package's own devDependencies, not from patient-web. The
 * earlier version reached into `../../patient-web/node_modules`, which meant the
 * generator only worked if some unrelated app had been installed first — and CI
 * would have failed on a fresh checkout for no visible reason.
 *
 * @phosphor-icons/react ships CJS and ESM builds, and this generator is ESM, so
 * the entry named by the package's own `module` field is used. Deriving it from
 * package.json rather than string-replacing a filename is what keeps this working
 * when the package renames its dist files.
 */
const req = createRequire(import.meta.url);


/** The ESM entry a package advertises, falling back to `main`. */
function phosphorModuleEntry(pkgJsonPath) {
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  const fromExports =
    typeof pkg.exports === 'string'
      ? pkg.exports
      : pkg.exports?.['.']?.import ?? pkg.exports?.['.']?.default;
  return fromExports ?? pkg.module ?? pkg.main;
}

const phosphorPkgPath = req.resolve('@phosphor-icons/react/package.json');
const phosphorEsm = pathToFileURL(join(dirname(phosphorPkgPath), phosphorModuleEntry(phosphorPkgPath))).href;
const phosphor = await import(phosphorEsm);
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');

const tokensCss = readFileSync(join(HERE, '..', 'design-tokens', 'dist', 'css', 'tokens.css'), 'utf8');
const fontsCss = readFileSync(join(HERE, '..', 'design-tokens', 'dist', 'css', 'fonts.css'), 'utf8');
const tokens = JSON.parse(readFileSync(join(HERE, '..', 'design-tokens', 'tokens.json'), 'utf8'));

/* -------------------------------------------- illustrated icons as inline SVG */

const art = tokens.color.iconArt;

function primSvg(prim) {
  const paint = (key) => (typeof key === 'string' && key !== 'none' ? art[key] : undefined);
  const attrs = (p) => {
    const out = [`fill="${p.fill === 'none' || p.fill === undefined ? 'none' : paint(p.fill)}"`];
    if (p.stroke) out.push(`stroke="${paint(p.stroke)}"`);
    if (p.strokeWidth !== undefined) out.push(`stroke-width="${p.strokeWidth}"`);
    if (p.opacity !== undefined) out.push(`opacity="${p.opacity}"`);
    out.push('stroke-linecap="round"', 'stroke-linejoin="round"');
    return out.join(' ');
  };
  if (prim.el === 'g') {
    const [a, cx, cy] = prim.rotate ?? [0, 0, 0];
    return `<g transform="rotate(${a} ${cx} ${cy})">${prim.children.map(primSvg).join('')}</g>`;
  }
  if (prim.el === 'path') return `<path d="${prim.d}" ${attrs(prim)}/>`;
  if (prim.el === 'circle') return `<circle cx="${prim.cx}" cy="${prim.cy}" r="${prim.r}" ${attrs(prim)}/>`;
  return `<rect x="${prim.x}" y="${prim.y}" width="${prim.w}" height="${prim.h}" rx="${prim.rx}" ${attrs(prim)}/>`;
}

const tile = (name, size) => {
  const tint = tokens.color.service[ICON_TINT[name]];
  return `<div class="tile">
  <div class="tile-art" style="background:var(--nabd-color-service-${ICON_TINT[name]}-bg);width:${size}px;height:${size}px">
    <svg width="${Math.round(size * 0.6)}" height="${Math.round(size * 0.6)}" viewBox="0 0 48 48" fill="none" aria-hidden="true">${ILLUSTRATED[name].map(primSvg).join('')}</svg>
  </div>
  <span class="tile-label">${name}</span>
</div>`;
};

/* ---------------------------------------------------------------- the page */

const surfaces = [
  ['bg.canvas', 'Canvas'],
  ['bg.surface', 'Surface / card'],
  ['bg.elevated', 'Elevated (sheets)'],
  ['bg.sunken', 'Sunken (segmented)'],
  ['bg.inverse', 'Inverse (hero)'],
  ['action.primary.bg', 'Action primary'],
  ['accent.lime', 'Accent lime (dark only)'],
];

const status = [
  ['success', 'success', 'success.fill'],
  ['warning', 'warning', null],
  ['danger', 'danger', null],
  ['info', 'info', 'info.fill'],
  ['neutral', 'neutral', null],
];

const LINE_COMPONENTS = {
  bell: 'Bell', calendar: 'CalendarBlank', search: 'MagnifyingGlass', cart: 'ShoppingCart',
  user: 'User', users: 'UsersThree', home: 'House', heart: 'Heart', clock: 'Clock',
  pin: 'MapPin', phone: 'Phone', card: 'CreditCard', star: 'Star', check: 'Check',
  'check-circle': 'CheckCircle', close: 'X', plus: 'Plus', minus: 'Minus',
  filter: 'Funnel', settings: 'Gear', list: 'List', download: 'DownloadSimple',
  trash: 'Trash', warning: 'Warning', signout: 'SignOut',
  'caret-down': 'CaretDown', 'caret-up': 'CaretUp', 'caret-left': 'CaretLeft', 'caret-right': 'CaretRight',
};
const lineNames = Object.keys(LINE_COMPONENTS);

/**
 * Render a Phosphor component to static markup. Called at build time only, so
 * the cost is irrelevant and the preview shows the real glyphs.
 */
function lineIconSvg(name, size) {
  const Component = phosphor?.[LINE_COMPONENTS[name]];
  if (!Component) return null;
  return renderToStaticMarkup(
    React.createElement(Component, { size, weight: 'regular', 'aria-hidden': 'true' }),
  );
}

function illustrationTile(name, size) {
  const meta = ILLUSTRATION_META[name];
  const art = `viewBox="0 0 ${GRID} ${GRID}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  return `<div class="scene" data-kind="${meta.kind}" data-scene="${name}">
  <div class="scene-art" style="width:${size}px;height:${size}px">
    <svg width="${Math.round(size * 0.86)}" height="${Math.round(size * 0.86)}" ${art} aria-hidden="true">${ILLUSTRATIONS[name].map(primSvg).join('')}</svg>
  </div>
  <span class="tile-label">${name}</span>
  <em class="scene-meta">${meta.titleEn} &middot; ${meta.tone}</em>
</div>`;
}

function theme(themeName) {
  // tokens.css names a variable after the dotted token path, with dashes.
  const c = (group) => `var(--nabd-color-${group.replace(/\./g, '-')})`;
  return `<section class="theme" data-theme="${themeName}">
  <h2>${themeName}</h2>
  <h3>Service tiles — illustrated, 76px (canvas home)</h3>
  <div class="row">${ILLUSTRATED_ICONS.map((n) => tile(n, 76)).join('')}</div>
  <h3>Service tiles — illustrated, 128px</h3>
  <div class="row">${ILLUSTRATED_ICONS.map((n) => tile(n, 128)).join('')}</div>
  <h3>Scenes — illustrations, 128px</h3>
  ${ILLUSTRATION_SECTIONS.map(
    (s) =>
      `<h4>${s.title}</h4><div class="row">${ILLUSTRATION_NAMES.filter(
        (n) => ILLUSTRATION_META[n].kind === s.kind,
      )
        .map((n) => illustrationTile(n, 128))
        .join('')}</div>`,
  ).join('')}
  ${componentsGallery()}
  <h3>Small UI line set — Phosphor regular, one weight</h3>
  <div class="row icons">${lineNames
    .map((n) => {
      const svg = lineIconSvg(n, 24);
      return `<span class="ic" title="${n}">${svg ?? '<em>missing</em>'}<em>${n}</em></span>`;
    })
    .join('')}</div>
  <h3>Surfaces</h3>
  <div class="row">${surfaces
    .map(
      ([token, label]) =>
        `<div class="swatch"><div class="chip" style="background:${c(token)}"></div><span>${label}</span><code>${token}</code></div>`,
    )
    .join('')}</div>
  <h3>Status</h3>
  <div class="row">${status
    .map(
      ([name]) =>
        `<div class="swatch"><div class="chip chip--status" style="background:${c(`status.${name}.bg`)};color:${c(`status.${name}.fg`)}">${name}</div><code>status.${name}.bg / .fg</code></div>`,
    )
    .join('')}</div>
  <div class="row">${status
    .filter(([, , fill]) => fill)
    .map(
      ([name, , fill]) =>
        `<div class="swatch"><div class="chip" style="background:${c(fill)}"></div><code>${fill}</code></div>`,
    )
    .join('')}</div>
  <h3>Acid lime always takes ink</h3>
  <div class="row">
    <div class="swatch"><div class="chip chip--status" style="background:${c('accent.lime')};color:${c('text.onAccent')}">onAccent</div><code>action.accent.bg</code></div>
    <div class="swatch"><div class="chip chip--status" style="background:${c('accent.lime')};color:${c('bg.inverse')}">ink</div><code>bg.inverse &mdash; passes, onInverse does not</code></div>
  </div>
  <h3>Type scale</h3>
  <div class="col">${Object.entries(tokens.font.size)
    .map(
      ([name, step]) =>
        `<div class="type"><span style="font-size:${step.size};line-height:${step.lineHeight};font-weight:${step.weight}">${name} ${step.size}</span><code>${name}</code></div>`,
    )
    .join('')}</div>
  <h3>Radius &amp; spacing</h3>
  <div class="row">${Object.entries(tokens.radius)
    .map(([k, v]) => `<div class="swatch"><div class="r" style="width:${v === '9999px' ? '56px' : v};height:40px;background:${c('action.secondary.bg')};border:1px solid ${c('border.strong')}"></div><span>${k}</span><code>${v}</code></div>`)
    .join('')}</div>
  <div class="row">${Object.entries(tokens.space)
    .map(([k, v]) => `<div class="swatch"><div class="r" style="width:${v};height:20px;background:${c('brand.coral')}"></div><span>${k}</span><code>${v}</code></div>`)
    .join('')}</div>
</section>`;
}

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nabd+ — design system preview (12.A6)</title>
<style>
${fontsCss}
${tokensCss}
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  padding: 32px clamp(16px, 4vw, 48px) 96px;
  font-family: var(--nabd-font-ar);
  background: var(--nabd-color-bg-canvas);
  color: var(--nabd-color-text-primary);
  -webkit-font-smoothing: antialiased;
}
header.page { max-width: 1180px; margin: 0 auto 40px; display: flex; align-items: center; gap: 12px; }
header.page svg { width: 40px; height: 40px; }
header.page strong { font-size: 24px; }
header.page span { color: var(--nabd-color-brand-coral); }
main { max-width: 1180px; margin: 0 auto; display: grid; gap: 40px; }
.theme { border: 1px solid var(--nabd-color-border-subtle); border-radius: var(--nabd-radius-3xl); padding: 24px; background: var(--nabd-color-bg-surface); }
.theme[data-theme="light"] { background: var(--nabd-color-bg-canvas); }
.theme[data-theme="dark"] { background: var(--nabd-color-bg-canvas); color: var(--nabd-color-text-primary); }
h2 { margin: 0 0 20px; font-size: var(--nabd-font-size-h2); line-height: var(--nabd-line-height-h2); text-transform: capitalize; }
h3 { margin: 28px 0 12px; font-size: var(--nabd-font-size-h4); line-height: var(--nabd-line-height-h4); color: var(--nabd-color-text-secondary); font-weight: var(--nabd-font-weight-h4); }
h3:first-of-type { margin-top: 0; }
.row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; }
.col { display: grid; gap: 8px; }
.tile { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.tile-art { display: grid; place-items: center; border-radius: var(--nabd-radius-2xl); box-shadow: var(--nabd-shadow-tile); }
.tile-label { font-size: var(--nabd-font-size-label); color: var(--nabd-color-text-secondary); }
h4 { font-size: var(--nabd-font-size-bodyStrong); color: var(--nabd-color-text-tertiary); margin: 18px 0 10px; font-weight: 600; }
.scene { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 168px; }
.scene-art { display: grid; place-items: center; border-radius: var(--nabd-radius-2xl); background: var(--nabd-color-bg-sunken); box-shadow: var(--nabd-shadow-tile); }
.scene[data-kind="error"] .scene-art { background: var(--nabd-color-status-danger-bg); }
.scene[data-kind="success"] .scene-art { background: var(--nabd-color-status-success-bg); }
.scene[data-kind="onboarding"] .scene-art { background: var(--nabd-color-bg-surface); }
.scene-meta { font-size: var(--nabd-font-size-caption); color: var(--nabd-color-text-tertiary); font-style: normal; text-align: center; }
.spec { display: flex; flex-direction: column; align-items: center; gap: 6px; }
/* Specimens sit on the canvas, as on the boards: a card component is the only card in its frame (a white frame made every card look nested). The frame is a dashed outline, not a surface. */
.spec-art { position: relative; display: grid; place-items: center; padding: var(--nabd-space-sm); border-radius: var(--nabd-radius-lg); background: var(--nabd-color-bg-canvas); border: 1px dashed var(--nabd-color-border-subtle); min-width: 120px; overflow: hidden; }
.spec-list { inline-size: 320px; border-radius: 24px; background: var(--nabd-color-bg-surface); border: 1px solid var(--nabd-color-border-hairline); box-shadow: var(--nabd-shadow-card); overflow: hidden; }
.spec-coral { padding: 10px 14px; border-radius: 0 0 22px 22px; background: linear-gradient(180deg, var(--nabd-color-action-fab-from), var(--nabd-color-action-fab-to)); }
/* An overlay specimen gets a taller box: the component is still position-fixed
   (correct for a real screen), but the containing block above keeps it inside
   its own specimen instead of over the whole gallery. */
.spec-art--overlay { min-width: 280px; min-height: 220px; overflow: hidden; }
.spec-art--overlay > * { position: absolute !important; inset: 0; }
.spec code { font-size: var(--nabd-font-size-micro); color: var(--nabd-color-text-tertiary); }
.spec-art--wide { min-width: 320px; }
.gallery { margin-top: 24px; }
.icons { gap: 20px; }
.ic { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--nabd-color-icon-primary); }
.ic em { font-style: normal; font-size: 10px; color: var(--nabd-color-text-tertiary); }
.swatch { display: flex; flex-direction: column; gap: 6px; font-size: var(--nabd-font-size-caption); }
.swatch code, .type code { color: var(--nabd-color-text-tertiary); font-size: 11px; }
.chip { width: 96px; height: 56px; border-radius: var(--nabd-radius-md); border: 1px solid var(--nabd-color-border-subtle); }
.chip--status { display: flex; align-items: center; justify-content: center; width: auto; height: 36px; padding: 0 16px; border: 0; font-size: var(--nabd-font-size-label); }
.r { border-radius: var(--nabd-radius-md); }
.type { display: flex; align-items: baseline; gap: 16px; }
</style>
</head>
<body>
<header class="page">
  <svg viewBox="0 0 240 240" width="40" height="40" aria-hidden="true">
    <path d="M40 104 C40 196 200 196 200 104" fill="none" stroke="var(--nabd-color-brand-coral)" stroke-width="36" stroke-linecap="round"/>
    <circle cx="120" cy="58" r="24" fill="var(--nabd-color-brand-coral)"/>
  </svg>
  <strong>نبض<span>+</span></strong>
  <code>Nabd+ design system — preview</code>
</header>
<main>
${theme('light')}
${theme('dark')}
</main>
</body>
</html>
`;

mkdirSync(DIST, { recursive: true });
const target = join(DIST, 'preview.html');


/* ------------------------------------------------------- component gallery */

/**
 * Specimens for every component in the contract, rendered through the real
 * components. If a specimen and a screen disagree, the specimen is wrong — which
 * is the whole reason the gallery calls the component instead of reimplementing
 * its markup in a template string.
 */
function specimen(name, body, note, variant) {
  return `<div class="spec"><div class="spec-art${variant ? ` spec-art--${variant}` : ''}">${body}</div><code>${name}</code>${
    note ? `<em class="scene-meta">${note}</em>` : ''
  }</div>`;
}

/** A specimen is a picture, not an interaction, so every handler is a no-op. */
function noop() {}

function componentsGallery() {
  if (!ui) return '';

  const h = React.createElement;
  const C = ui;
  const F = fixtures;
  const out = [];

  out.push('<h3>Controls</h3><div class="row">');
  for (const v of ['primary', 'secondary', 'ghost', 'danger', 'lime']) {
    out.push(specimen(`Button ${v}`, render(h(C.Button, { label: v, variant: v, size: 'md' }))));
  }
  out.push(specimen('Button sm', render(h(C.Button, { label: 'small', size: 'sm' }))));
  out.push(specimen('Button lg', render(h(C.Button, { label: 'large', size: 'lg' }))));
  out.push(specimen('Button loading', render(h(C.Button, { label: 'Saving', loading: true }))));
  out.push(specimen('Button disabled', render(h(C.Button, { label: 'Disabled', disabled: true }))));
  out.push('</div>');

  out.push('<h3>Icon buttons</h3><div class="row">');
  for (const v of ['plain', 'outlined', 'filled', 'tinted']) {
    out.push(specimen(`IconButton ${v}`, render(h(C.IconButton, { name: 'close', label: `Close (${v})`, variant: v, onClick: noop }))));
  }
  out.push('</div>');

  out.push('<h3>Inputs</h3><div class="row">');
  out.push(specimen('Input', render(h(C.Input, { label: 'Full name', placeholder: 'e.g. Amina', startIcon: 'user', onChange: noop }))));
  out.push(specimen('Input invalid', render(h(C.Input, { label: 'Phone', error: 'Enter a valid mobile number', onChange: noop }))));
  out.push(specimen('TextArea', render(h(C.Input, { label: 'Notes', multiline: true, rows: 3, onChange: noop }))));
  out.push(specimen('Select', render(h(C.Select, { label: 'City', options: F.CITIES, placeholder: 'Choose', onChange: noop }))));
  out.push(specimen('Otp', render(h(C.Otp, { label: 'Verification code', length: 6, onChange: noop, onComplete: noop }))));
  out.push(specimen('Search', render(h(C.Search, { placeholder: 'Search medicines', onChange: noop, onFilterPress: noop, filterLabel: 'Filter' }))));
  out.push(specimen('Stepper', render(h(C.Stepper, { value: 2, onChange: noop, label: 'Quantity', min: 1, max: 9 }))));
  out.push(specimen('SlotPicker', render(h(C.SlotPicker, { dayLabel: 'Sunday 12 Oct', slots: F.SLOTS, value: '1000', onChange: noop }))));
  out.push('</div>');

  out.push('<h3>Chips &amp; badges</h3><div class="row">');
  for (const t of ['neutral', 'primary', 'success', 'warning', 'danger', 'info']) {
    out.push(specimen(`Chip ${t}`, render(h(C.Chip, { label: t, tone: t }))));
  }
  out.push(specimen('Chip dismiss', render(h(C.Chip, { label: 'Selected', variant: 'solid', tone: 'primary', onDismissLabel: 'Remove Selected' }))));
  out.push(specimen('Badge 7', render(h(C.Badge, { content: 7 }))));
  out.push(specimen('Badge 142 (capped)', render(h(C.Badge, { content: 142 }))));
  out.push('</div>');

  out.push('<h3>Surfaces</h3><div class="row">');
  out.push(specimen('Card', render(h(C.Card, { title: 'Order #4821', subtitle: 'Confirmed · 12 Oct', footer: 'Pay at the clinic' }))));
  // list rows live inside one white card on the boards (canvas/Account.dc.html)
  out.push(specimen('ListItem', `<div class="spec-list">${render(h(C.ListItem, { title: 'Dr. Amina Haddad', subtitle: 'Endocrinology', meta: '4.9', startIcon: 'star' }))}</div>`));
  out.push(specimen('ListItem leading', `<div class="spec-list">${render(h(C.ListItem, { title: 'Addresses', subtitle: '2 saved', leading: { icon: 'map-pin-line', tone: 'coral' } }))}${render(h(C.ListItem, { title: 'Payment cards', subtitle: 'For payment only', leading: { icon: 'credit-card', tone: 'blue' } }))}</div>`));
  out.push(specimen('SectionHeader', render(h(C.SectionHeader, { title: 'Offers and packages', actionLabel: 'See all' }))));
  for (const tile of F.SERVICE_TILES) {
    out.push(specimen(`ServiceTile ${tile.name}`, render(h(C.ServiceTile, { name: tile.name, label: tile.label }))));
  }
  for (const size of ['sm', 'lg']) {
    out.push(specimen(`ServiceTile ${size}`, render(h(C.ServiceTile, { name: 'pharmacy', label: 'Pharmacy', size }))));
  }
  out.push(specimen('ServiceTile badge', render(h(C.ServiceTile, { name: 'consult', label: 'Consult', badge: 3 }))));
  // No cartoon or illustrated people (handoff §1): a real photo (src), else initials, else the neutral user icon.
  out.push(specimen('Avatar initials', render(h(C.Avatar, { name: 'Amina Haddad', status: 'online' }))));
  out.push(specimen('Avatar no name (neutral)', render(h(C.Avatar, { name: '' }))));
  out.push(specimen('PriceTag', render(h(C.PriceTag, { amount: '240', currency: 'SAR', was: '300', note: '20% off' }))));
  // DoctorCard board: one filled star, value, (count); nothing when there are no real ratings
  out.push(specimen('Rating', render(h(C.Rating, { value: 4.8, count: 128 }))));
  out.push(specimen('Rating onBrand (DoctorCard footer)', `<div class="spec-coral">${render(h(C.Rating, { value: 4.8, count: 128, surface: 'onBrand' }))}</div>`));
  out.push(specimen('Rating, no ratings', render(h(C.Rating, { value: null, count: 0 })) || '<em class="scene-meta">renders nothing</em>'));
  out.push(specimen('MapPinCard', render(h(C.MapPinCard, { title: 'Nabd+ Olaya', address: 'King Fahd Rd', distance: '1.2 km', actionLabel: 'Directions' }))));
  out.push('</div>');

  out.push('<h3>FIcon (handoff §1): soft, solid and none, every tone</h3><div class="row">');
  for (const tone of C.SERVICE_TONES) {
    out.push(specimen(`FIcon ${tone}`, render(h(C.FIcon, { icon: 'pill', tone, size: 52 }))));
    out.push(specimen(`FIcon ${tone} solid`, render(h(C.FIcon, { icon: 'pill', tone, size: 52, chip: 'solid' }))));
  }
  out.push(specimen('FIcon none', render(h(C.FIcon, { icon: 'heartbeat', tone: 'coral', size: 32, chip: 'none' }))));
  out.push(specimen('FIcon empty-state size', render(h(C.FIcon, { icon: 'package', tone: 'ink', size: 96 }))));
  out.push('</div>');

  out.push('<h3>Navigation</h3><div class="row">');
  out.push(specimen('Tabs line', render(h(C.Tabs, { items: F.TABS, value: 'home', onChange: noop }))));
  out.push(specimen('Tabs segmented', render(h(C.Tabs, { items: F.SEGMENTED, value: 'all', variant: 'segmented', onChange: noop }))));
  out.push(specimen('NavBar', render(h(C.NavBar, { title: 'Order details', showBack: true, backLabel: 'Back', actions: [{ name: 'close', label: 'Close' }] }))));
  out.push(specimen('BottomTabBar', render(h(C.BottomTabBar, { items: F.TABS, value: 'bookings', onChange: noop }))));
  out.push(specimen('Sidebar', render(h(C.Sidebar, { title: 'Admin', items: F.SIDEBAR_ITEMS, value: 'orders', onChange: noop }))));
  out.push('</div>');

  out.push('<h3>Status</h3><div class="row">');
  out.push(specimen('EmptyState', render(h(C.EmptyState, { illustration: 'emptyOrders', title: 'No orders yet', body: 'Your orders will appear here once you place one.', actionLabel: 'Browse medicines' }))));
  out.push(specimen('ErrorState', render(h(C.ErrorState, { title: 'We could not reach Nabd+', body: 'Check your connection and try again.', detail: 'TypeError: fetch failed', retryLabel: 'Try again' }))));
  out.push(specimen('Toast', render(h(C.Toast, { message: 'Order confirmed', tone: 'success', dismissible: true, dismissLabel: 'Dismiss' })), undefined, 'overlay'));
  out.push(specimen('Modal', render(h(C.Modal, { open: true, title: 'Cancel this order?', body: 'The clinic will be notified.', confirmLabel: 'Cancel order', cancelLabel: 'Keep it', destructive: true, closeLabel: 'Close' })), undefined, 'overlay'));
  out.push(specimen('Skeleton text', render(h(C.Skeleton, { variant: 'text', lines: 3 }))));
  out.push(specimen('Skeleton tile', render(h(C.Skeleton, { variant: 'tile' }))));
  out.push(specimen('DataTable', render(h(C.DataTable, {
    columns: [{ key: 'id', header: 'Order' }, { key: 'total', header: 'Total', numeric: true }],
    rows: [{ id: '#4821', total: '240' }, { id: '#4822', total: '180' }],
    rowKey: (r) => String(r.id),
    emptyMessage: 'No orders',
    caption: 'Recent orders',
  })), undefined, 'wide'));
  out.push(specimen('ChartCard', render(h(C.ChartCard, { title: 'Orders this week', summary: '42 orders, up 12% on last week', legend: [{ label: 'This week', value: '42' }] }))));
  out.push('</div>');

  return `<section class="gallery"><h2>Components — the A7 roster, rendered</h2>${out.join('')}</section>`;
}

function render(el) {
  return renderToStaticMarkup(el);
}

const summary =
  `${ILLUSTRATED_ICONS.length} illustrated icons, ` +
  `${ILLUSTRATION_NAMES.length} scenes, ` +
  `${lineNames.length} line icons, both themes.`;

if (CHECK_ONLY) {
  if (!existsSync(target) || readFileSync(target, 'utf8') !== html) {
    console.error('preview: out of date. Run: node packages/ui/build-preview.mjs');
    process.exit(1);
  }
  console.log(`preview: dist/preview.html is up to date — ${summary}`);
} else {
  writeFileSync(target, html, 'utf8');
  console.log(`preview: wrote dist/preview.html — ${summary}`);
}
