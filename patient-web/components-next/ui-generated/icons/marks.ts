/**
 * Small marks the boards draw outside the FIcon set, ported unchanged (not redrawn):
 *
 *   SEAL / SEAL_CHECK   the verified badge beside a doctor's name (canvas/Consult.dc.html),
 *                       viewBox 0 0 24 24, the seal filled, the check stroked 2 with round caps;
 *   CLOCK               the next-slot clock in the DoctorCard footer (canvas/Consult.dc.html),
 *                       viewBox 0 0 24 24, stroked 2;
 *   PLUS_SQUARE         the add-to-cart glyph of the product card (canvas/PharmacyHub.dc.html),
 *                       Phosphor fill, viewBox 0 0 256 256.
 */
// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/icons/marks.ts by tools/design/sync-ui-components.mjs.
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
export const MARK_VIEWBOX_24 = '0 0 24 24';

export const SEAL_PATH =
  'M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z';
export const SEAL_CHECK_PATH = 'M8.5 12.2l2.3 2.3 4.7-4.7';
export const CLOCK_PATH = 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z M12 7v5l3 2';
export const PLUS_SQUARE_PATH =
  'M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM184,136H136v48a8,8,0,0,1-16,0V136H72a8,8,0,0,1,0-16h48V72a8,8,0,0,1,16,0v48h48a8,8,0,0,1,0,16Z';

/**
 * Third-party sign-in brand marks (Google, X, Snapchat). They are not part of the boards' icon set and are
 * single-colour by design (drawn in the text colour of the button, never in the brands' own colours). The
 * outlines are the FontAwesome Free brand glyphs (CC BY 4.0, https://fontawesome.com/license/free) that
 * `@expo/vector-icons` drew until now, converted to path data so screens no longer import an icon font.
 * Each viewBox is the glyph's own advance box (y flipped to SVG's downward axis).
 */
export const BRAND_GOOGLE_VIEWBOX = '0 -448 488 512';
export const BRAND_GOOGLE_PATH =
  'M488 -186Q488 -80 421.5 -12Q355 56 248 56Q145 56 72.5 -16.5Q0 -89 0 -192Q0 -295 72.5 -367.5Q145 -440 248 -440Q345 -440 414 -375L347 -310Q315 -341 270.5 -346.5Q226 -352 187.5 -335.5Q149 -319 121.5 -280.5Q94 -242 94 -192Q94 -127 139 -81Q184 -35 248 -35Q283 -35 310.5 -46.5Q338 -58 353.5 -75.5Q369 -93 377.5 -110Q386 -127 389 -142H248V-228H484Q488 -206 488 -186Z';
export const BRAND_X_VIEWBOX = '0 -460 512 535';
export const BRAND_X_PATH =
  'M389 -400H460H389H460L306 -224L487 16H345L234 -129L107 16H36L201 -172L27 -400H172L273 -267L389 -400ZM364 -26H404H364H404L151 -360H109L364 -26Z';
export const BRAND_SNAPCHAT_VIEWBOX = '0 -448 512 512';
export const BRAND_SNAPCHAT_PATH =
  'M512 -55Q504 -37 444 -28Q444 -27 443 -23Q442 -19 440.5 -13.5Q439 -8 438 -4Q435 5 426 5Q422 5 410 2.5Q398 0 387 0Q368 0 358 4.5Q348 9 330 21Q290 50 256 48Q226 51 184 21Q166 9 156 4.5Q146 0 127 0Q117 0 104 2.5Q91 5 88 5Q79 5 76 -4Q75 -7 73.5 -13Q72 -19 71 -23Q70 -27 70 -28Q2 -38 1 -60Q1 -60 1 -61Q1 -70 10 -71Q29 -74 47 -84.5Q65 -95 75.5 -105.5Q86 -116 95.5 -129Q105 -142 108 -147.5Q111 -153 112 -157Q112 -157 112 -158Q118 -169 115 -176Q113 -181 108 -184.5Q103 -188 98.5 -189.5Q94 -191 87 -193Q80 -195 79 -196Q50 -208 53 -224Q55 -233 66.5 -238Q78 -243 86 -239Q100 -233 110 -233Q116 -233 120 -235Q117 -259 117 -295.5Q117 -332 125 -351Q137 -377 155.5 -395Q174 -413 194 -420.5Q214 -428 227 -430.5Q240 -433 252 -433Q252 -433 256.5 -433Q261 -433 262 -433Q303 -433 337 -412Q371 -391 389 -351Q397 -332 397 -295.5Q397 -259 394 -235Q398 -233 403 -233Q413 -233 425 -239Q435 -244 446 -239Q461 -234 461 -221Q461 -207 435 -196Q433 -195 428 -194Q403 -186 399 -176Q396 -169 402 -158Q402 -157 402 -157Q403 -153 406 -147.5Q409 -142 418.5 -129Q428 -116 438.5 -105.5Q449 -95 467 -84.5Q485 -74 504 -71Q509 -70 511.5 -65.5Q514 -61 512 -55Z';
