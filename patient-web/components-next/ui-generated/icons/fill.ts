/* GENERATED from docs/design/canvas/FIcon.dc.html by tools/design/extract-ficon.mjs. Do not edit. */
/**
 * The filled icon set of handoff §1: Phosphor "fill" glyphs, viewBox 0 0 256 256,
 * drawn inside a soft-tinted rounded square by <FIcon> on web and native.
 */
// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/icons/fill.ts by tools/design/sync-ui-components.mjs.
//
// patient-web cannot import from packages/: Turbopack refuses to resolve outside
// the app root, and the type checker does not, so the failure only appears at
// `next build`. This file is a copy, not a port — the renderer a screen uses and
// the renderer the conformance gallery exercises are the same code, so the
// artwork cannot drift between them. Run the script after changing the package;
// `--check` in CI fails if this drifts.
//
// tests/module-boundary.test.ts enforces the boundary this mirror exists to work
// around.

export const FILL_ICON_VIEWBOX = '0 0 256 256';

// WEB MIRROR: only the 57 CORE glyph NAMES of 78 (tools/design/sync-ui-components.mjs, tools/design/fill-core.json): the outlines are not in this module (a client bundle would ship them all); a core glyph is drawn from the icon sprite (icons/sprite.ts), any other with FIcon's `glyph` prop.
// Any other glyph is drawn with FIcon's `glyph` prop (icons/glyphs/<name>.ts), which the mirrored contract requires for it.
export const FILL_CORE_NAMES = ["pill","stethoscope","test-tube","first-aid-kit","bowl-food","baby","map-trifold","heartbeat","ambulance","brain","users-three","scan","sparkle","translate","chart-line-up","heart","drop","calendar-dots","video-camera","house","prescription","storefront","clock-counter-clockwise","chat-circle-text","arrows-left-right","barcode","syringe","star","map-pin","hospital","gift","tag","bell","shield-check","moped","check-circle","wifi-slash","user","user-circle","gear","moon","package","camera","image","file-text","thermometer","scales","warning","magnifying-glass","headset","identification-card","users","key","plus","info","clipboard-text","first-aid"] as const;

/** The glyphs that are NOT core: drawn with `glyph`, never by name alone. */
export type FillExtraName = 'robot' | 'squares-four' | 'tooth' | 'eye' | 'bone' | 'hand-heart' | 'credit-card' | 'truck' | 'x-circle' | 'globe' | 'lock' | 'sign-out' | 'question' | 'receipt' | 'map-pin-line' | 'address-book' | 'fingerprint' | 'trash' | 'baby-carriage' | 'flower-lotus' | 'person';
/** Every glyph of the set, core or extra. */
export type FillAnyName = FillIconName | FillExtraName;

export type FillIconName = (typeof FILL_CORE_NAMES)[number];

export const FILL_ICON_NAMES: readonly FillIconName[] = FILL_CORE_NAMES;

/** The tones of color.service.<tone> (tokens.json). */
export const SERVICE_TONES = ['coral', 'blue', 'mint', 'violet', 'amber', 'pink', 'lime', 'peach', 'teal', 'ink'] as const;
export type ServiceTone = (typeof SERVICE_TONES)[number];

/** Handoff §1 service map: which icon and tone each service always uses. */
export const SERVICE_ICONS = {
  consult: { icon: 'stethoscope', tone: 'blue' },
  pharmacy: { icon: 'pill', tone: 'coral' },
  lab: { icon: 'test-tube', tone: 'mint' },
  radiology: { icon: 'scan', tone: 'violet' },
  nursing: { icon: 'first-aid-kit', tone: 'teal' },
  nutrition: { icon: 'bowl-food', tone: 'lime' },
  maternity: { icon: 'baby', tone: 'pink' },
  map: { icon: 'map-trifold', tone: 'amber' },
  health: { icon: 'heartbeat', tone: 'coral' },
  emergency: { icon: 'ambulance', tone: 'peach' },
  mind: { icon: 'brain', tone: 'violet' },
  family: { icon: 'users-three', tone: 'peach' },
  insurance: { icon: 'shield-check', tone: 'blue' },
  points: { icon: 'star', tone: 'amber' },
} as const satisfies Record<string, { icon: FillIconName; tone: ServiceTone }>;

export type ServiceName = keyof typeof SERVICE_ICONS;
