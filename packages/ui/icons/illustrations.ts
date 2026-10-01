/**
 * The illustration set — 12.A6.
 *
 * Seventeen SCENES, on a 64x64 grid, drawn with the same primitives and the same
 * rules as the illustrated icon set in `./illustrated.ts`: flat fills from the
 * brand palette, a 2.2px ink outline, rounded joins, one soft highlight, and
 * colours that are palette KEYS rather than hex so they resolve through
 * `color.iconArt` and a palette change moves the artwork with it.
 *
 * The canvas (`docs/design/canvas/`) specifies the set: three onboarding scenes,
 * eight empty states, three error states and three success states. These are the
 * ones the app actually needs — an empty list is the most-seen screen in the
 * product and it is the one the canvas gives the most care to.
 *
 * Two rules the artwork itself obeys, because the canvas lists them:
 *
 *   - **No text, ever.** No glyphs, no digits, no punctuation. A "404" drawn as
 *     a path is 404 drawn wrong the moment the user is Arabic-first, so the
 *     number lives in app text and the picture stays language-free.
 *   - **Acid lime takes ink.** `successPayment` puts a check on lime with an
 *     ink stroke. Lime under white text is 1.06:1 — the contrast checker rejects
 *     it, and the drawing shows the same rule the checker enforces.
 *
 * The grid is 64 rather than 48 because a scene carries a subject, a supporting
 * mark and a badge; the illustrated ICONS stay on 48. `viewBox` is therefore a
 * property of the set, not of the component, and is exported as `GRID`.
 */

import type { Prim } from './illustrated';

export const GRID = 64;

export type IllustrationKind = 'onboarding' | 'empty' | 'error' | 'success';

export interface IllustrationMeta {
  kind: IllustrationKind;
  /** The `color.iconArt` key the scene is built around — drives the tile tint. */
  tone: string;
  /** Which of the three tones a screen should give the surrounding tile. */
  surface: 'neutral' | 'calm' | 'alert' | 'positive';
  titleAr: string;
  titleEn: string;
}

export const ILLUSTRATION_NAMES = [
  // onboarding
  'onboardingWelcome',
  'onboardingBook',
  'onboardingTrack',
  // empty states
  'emptyOrders',
  'emptyBookings',
  'emptyCart',
  'emptyNotifications',
  'emptySearch',
  'emptyFamily',
  'emptyReminders',
  'emptyPrescriptions',
  // errors
  'errorOffline',
  'errorNotFound',
  'errorServer',
  // success
  'successOrder',
  'successBooking',
  'successPayment',
] as const;

export type IllustrationName = (typeof ILLUSTRATION_NAMES)[number];

const HALO = { fill: 'mint' as const, opacity: 0.14 };

export const ILLUSTRATIONS: Record<IllustrationName, Prim[]> = {
  /* ------------------------------------------------------------- onboarding */

  // The Noon Dot at full strength, the way the canvas opens the app: the bowl
  // holding, the pulse above it, a heart seated in the bowl. The bowl and dot
  // are the mark from packages/brand/src/logo-mark.svg, scaled to this grid.
  onboardingWelcome: [
    { el: 'circle', cx: 32, cy: 31, r: 26, fill: 'coral', opacity: 0.1 },
    { el: 'path', d: 'M10.7 28 C10.7 52 53.3 52 53.3 28', stroke: 'coral', strokeWidth: 6 },
    { el: 'circle', cx: 32, cy: 15, r: 6.4, fill: 'coral' },
    {
      el: 'path',
      d: 'M32 40 s-5.6-3.5-5.6-7.2 a2.8 2.8 0 0 1 5.6-1 a2.8 2.8 0 0 1 5.6 1 c0 3.7-5.6 7.2-5.6 7.2 z',
      fill: 'paper',
    },
    { el: 'path', d: 'M54 12 l1 2.4 2.4 1-2.4 1 L54 19 l-1-2.6-2.4-1 2.4-1 z', fill: 'amber' },
    { el: 'path', d: 'M10 44 l.8 2 2 .8-2 .8 L10 50 l-.8-2.4-2-.8 2-.8 z', fill: 'lime' },
  ],

  // A booking being made: a calendar with two free slots and a confirmed tick.
  onboardingBook: [
    { el: 'path', d: 'M8 19 a7 7 0 0 1 7-7 h34 a7 7 0 0 1 7 7 v5 H8 z', fill: 'coral' },
    { el: 'rect', x: 8, y: 12, w: 48, h: 40, rx: 7, fill: 'paper', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M8 19 a7 7 0 0 1 7-7 h34 a7 7 0 0 1 7 7 v5 H8 z', fill: 'coral' },
    { el: 'path', d: 'M8 24 h48', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M20 8 v8 M44 8 v8', stroke: 'ink', strokeWidth: 2.6 },
    { el: 'path', d: 'M16 33 h26 M16 41 h16', stroke: 'blue', strokeWidth: 3 },
    { el: 'circle', cx: 49, cy: 46, r: 9, fill: 'mint', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M44.5 46 l3 3 l6-6.5', stroke: 'paper', strokeWidth: 2.6 },
  ],

  // Something on its way: a sealed parcel, a motion arc and a destination pin.
  onboardingTrack: [
    { el: 'path', d: 'M6 56 a26 4 0 0 1 52 0 z', fill: 'amber', opacity: 0.3 },
    { el: 'rect', x: 8, y: 30, w: 26, h: 24, rx: 4, fill: 'amber', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M21 30 v24 M8 39 h26', stroke: 'ink', strokeWidth: 2 },
    { el: 'path', d: 'M38 28 a14 14 0 0 1 0 22', stroke: 'blue', strokeWidth: 3 },
    {
      el: 'path',
      d: 'M46 10 a8 8 0 0 1 8 8 c0 6-8 13-8 13 s-8-7-8-13 a8 8 0 0 1 8-8 z',
      fill: 'coral',
      stroke: 'ink',
      strokeWidth: 2.2,
    },
    { el: 'circle', cx: 46, cy: 18, r: 2.8, fill: 'paper' },
    { el: 'path', d: 'M14 22 l.8 2 2 .8-2 .8 L14 27 l-.8-2.4-2-.8 2-.8 z', fill: 'lime' },
  ],

  /* ----------------------------------------------------------- empty states */

  // A receipt with nothing written on it, and a plus that offers the action.
  emptyOrders: [
    {
      el: 'path',
      d: 'M14 8 h26 l8 8 v38 a4 4 0 0 1-4 4 H18 a4 4 0 0 1-4-4 z',
      fill: 'paper',
      stroke: 'ink',
      strokeWidth: 2.2,
    },
    { el: 'path', d: 'M40 8 v8 h8', stroke: 'ink', strokeWidth: 2 },
    { el: 'path', d: 'M20 28 h20 M20 35 h13 M20 42 h16', stroke: 'blue', strokeWidth: 2.6, opacity: 0.75 },
    { el: 'circle', cx: 47, cy: 47, r: 9, fill: 'mint', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M47 42.5 v9 M42.5 47 h9', stroke: 'paper', strokeWidth: 2.6 },
  ],

  // A calendar whose grid is dots: slots exist, none are taken.
  emptyBookings: [
    { el: 'rect', x: 8, y: 14, w: 48, h: 40, rx: 7, fill: 'paper', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M8 21 a7 7 0 0 1 7-7 h34 a7 7 0 0 1 7 7 v5 H8 z', fill: 'violet' },
    { el: 'path', d: 'M8 26 h48', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M20 10 v8 M44 10 v8', stroke: 'ink', strokeWidth: 2.6 },
    { el: 'circle', cx: 20, cy: 34, r: 2.4, fill: 'blue', opacity: 0.55 },
    { el: 'circle', cx: 32, cy: 34, r: 2.4, fill: 'blue', opacity: 0.55 },
    { el: 'circle', cx: 44, cy: 34, r: 2.4, fill: 'blue', opacity: 0.55 },
    { el: 'circle', cx: 20, cy: 45, r: 2.4, fill: 'blue', opacity: 0.55 },
    { el: 'circle', cx: 32, cy: 45, r: 2.4, fill: 'blue', opacity: 0.55 },
    { el: 'circle', cx: 44, cy: 45, r: 2.4, fill: 'blue', opacity: 0.55 },
    { el: 'path', d: 'M55 8 l.8 2 2 .8-2 .8 L55 14 l-.8-2.4-2-.8 2-.8 z', fill: 'amber' },
  ],

  // A basket with nothing in it. The slats are drawn, so it reads as a cart
  // rather than a box, and the wheels stay in the frame.
  emptyCart: [
    { el: 'path', d: 'M6 12 h7 l3 8', stroke: 'ink', strokeWidth: 2.4 },
    { el: 'path', d: 'M13 20 h40 l-5 24 a5 5 0 0 1-5 4 H23 a5 5 0 0 1-5-4 z', fill: 'blueSoft', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M23 20 l2 28 M33 20 v28 M43 20 l-2 28', stroke: 'ink', strokeWidth: 1.8, opacity: 0.3 },
    { el: 'circle', cx: 25, cy: 56, r: 3.6, fill: 'ink' },
    { el: 'circle', cx: 43, cy: 56, r: 3.6, fill: 'ink' },
    { el: 'path', d: 'M52 14 l.9 2.2 2.2 .9-2.2 .9 L52 20 l-.9-2.2-2.2-.9 2.2-.9 z', fill: 'lime' },
  ],

  // A bell with a coral slash: notifications are off, and that is fine.
  emptyNotifications: [
    { el: 'path', d: 'M32 14 a11 11 0 0 1 11 11 v9 l4 6 H17 l4-6 v-9 a11 11 0 0 1 11-11 z', fill: 'amber', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'circle', cx: 32, cy: 11, r: 3, fill: 'coral', stroke: 'ink', strokeWidth: 2 },
    { el: 'path', d: 'M27.5 44 a5 5 0 0 0 9 0', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M14 50 L50 14', stroke: 'coral', strokeWidth: 4 },
    { el: 'path', d: 'M12 20 l.7 1.8 1.8 .7-1.8 .7 L12 25 l-.7-1.8-1.8-.7 1.8-.7 z', fill: 'mint' },
  ],

  // A magnifier over a cross rather than a result. The cross is coral because a
  // search that found nothing is information, not a failure.
  emptySearch: [
    { el: 'circle', cx: 27, cy: 27, r: 15, fill: 'paper', stroke: 'ink', strokeWidth: 2.4 },
    { el: 'path', d: 'M22 22 l10 10 M32 22 l-10 10', stroke: 'coral', strokeWidth: 2.8 },
    { el: 'path', d: 'M38 38 l11 11', stroke: 'ink', strokeWidth: 5 },
    { el: 'path', d: 'M50 12 l.9 2.2 2.2 .9-2.2 .9 L50 18 l-.9-2.2-2.2-.9 2.2-.9 z', fill: 'lime' },
    { el: 'path', d: 'M10 14 l.7 1.8 1.8 .7-1.8 .7 L10 19 l-.7-1.8-1.8-.7 1.8-.7 z', fill: 'amber' },
  ],

  // A household of two, and a plus where the next member goes.
  emptyFamily: [
    { el: 'circle', cx: 19, cy: 24, r: 6.5, fill: 'skin', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M6 54 c0-8.5 5.8-14 13-14 s13 5.5 13 14 z', fill: 'coral', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'circle', cx: 40, cy: 30, r: 5.5, fill: 'skin', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M30 54 c0-7 4.8-11 10-11 s10 4 10 11 z', fill: 'blue', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'circle', cx: 53, cy: 13, r: 8, fill: 'mint', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M53 9 v8 M49 13 h8', stroke: 'paper', strokeWidth: 2.4 },
  ],

  // A clock at rest with a leaf across it: nothing is due, nothing is late.
  // The leaf is drawn as a full symmetrical leaf with a midrib — an earlier pass
  // used a half-leaf, which read as a diagonal bar and made the whole scene look
  // like a "no entry" sign instead of a quiet clock.
  emptyReminders: [
    { el: 'circle', cx: 30, cy: 32, r: 19, fill: 'paper', stroke: 'ink', strokeWidth: 2.4 },
    { el: 'circle', cx: 30, cy: 32, r: 14, stroke: 'ink', strokeWidth: 1.6, opacity: 0.26 },
    { el: 'path', d: 'M30 15 v4 M30 45 v4 M13 32 h4 M43 32 h4', stroke: 'ink', strokeWidth: 1.8, opacity: 0.4 },
    {
      el: 'path',
      d: 'M43 20.5 C35.2 20.5 30.5 25.6 30.5 32 C30.5 38.4 35.2 43.5 43 43.5 Z',
      fill: 'mint',
      stroke: 'ink',
      strokeWidth: 2,
    },
    { el: 'path', d: 'M43 22 V42', stroke: 'ink', strokeWidth: 1.4, opacity: 0.45 },
    { el: 'path', d: 'M30.5 32 h-4.5', stroke: 'ink', strokeWidth: 1.8 },
    { el: 'path', d: 'M54 12 l.8 2 2 .8-2 .8 L54 17 l-.8-2.4-2-.8 2-.8 z', fill: 'amber' },
  ],

  // A prescription pad, a blank line, and the capsule that is not written yet.
  emptyPrescriptions: [
    { el: 'rect', x: 8, y: 12, w: 34, h: 44, rx: 6, fill: 'paper', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'rect', x: 22, y: 6, w: 13, h: 8, rx: 3, fill: 'blue', stroke: 'ink', strokeWidth: 2 },
    { el: 'path', d: 'M15 28 h20 M15 36 h13', stroke: 'ink', strokeWidth: 2, opacity: 0.32 },
    {
      el: 'g',
      rotate: [-32, 44, 42],
      children: [
        { el: 'rect', x: 34, y: 37, w: 22, h: 10, rx: 5, fill: 'violet', stroke: 'ink', strokeWidth: 2.2 },
        { el: 'path', d: 'M45 37 v10', stroke: 'ink', strokeWidth: 2 },
      ],
    },
    { el: 'path', d: 'M16 48 l.7 1.8 1.8 .7-1.8 .7 L16 53 l-.7-1.8-1.8-.7 1.8-.7 z', fill: 'lime' },
  ],

  /* ------------------------------------------------------------------ errors */

  // No connection: a cloud cut by a coral slash, and packets falling away. The
  // back cloud gives the scene depth so the slash has something to cut through.
  errorOffline: [
    { el: 'path', d: 'M14 40 a8 8 0 0 1 1-15 a10 10 0 0 1 19-3 a7 7 0 0 1 3 18 z', fill: 'blueSoft', opacity: 0.45 },
    { el: 'path', d: 'M20 46 a11 11 0 0 1 1-20.9 a14 14 0 0 1 25.6-4.3 a9.5 9.5 0 0 1 4 25.2 z', fill: 'blueSoft', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M11 53 L53 11', stroke: 'coral', strokeWidth: 4 },
    { el: 'circle', cx: 18, cy: 50, r: 2.2, fill: 'ink', opacity: 0.45 },
    { el: 'circle', cx: 29, cy: 55, r: 1.8, fill: 'ink', opacity: 0.32 },
    { el: 'circle', cx: 39, cy: 50, r: 1.8, fill: 'ink', opacity: 0.32 },
  ],

  // Not found: a page with a folded corner, and a magnifier that has read it all.
  errorNotFound: [
    {
      el: 'path',
      d: 'M10 8 h24 l11 11 v37 a4 4 0 0 1-4 4 H14 a4 4 0 0 1-4-4 z',
      fill: 'paper',
      stroke: 'ink',
      strokeWidth: 2.2,
    },
    { el: 'path', d: 'M34 8 v11 h11', stroke: 'ink', strokeWidth: 2 },
    { el: 'path', d: 'M17 30 h16 M17 38 h10', stroke: 'ink', strokeWidth: 2, opacity: 0.3 },
    { el: 'circle', cx: 40, cy: 44, r: 9, stroke: 'coral', strokeWidth: 2.6 },
    { el: 'path', d: 'M46.8 50.8 l7 7', stroke: 'coral', strokeWidth: 3.4 },
  ],

  // Something on our side broke: a two-slot rack, one light amber, one red, and
  // a warning that does not blame the reader.
  errorServer: [
    { el: 'rect', x: 8, y: 18, w: 40, h: 13, rx: 3.5, fill: 'paper', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M8 36 h40', stroke: 'ink', strokeWidth: 2, opacity: 0.35 },
    { el: 'rect', x: 8, y: 36, w: 40, h: 13, rx: 3.5, fill: 'paper', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'circle', cx: 16, cy: 24.5, r: 2.4, fill: 'amber', stroke: 'ink', strokeWidth: 1.4 },
    { el: 'circle', cx: 16, cy: 42.5, r: 2.4, fill: 'coral', stroke: 'ink', strokeWidth: 1.4 },
    { el: 'path', d: 'M24 24.5 h16 M24 42.5 h11', stroke: 'ink', strokeWidth: 2, opacity: 0.3 },
    { el: 'path', d: 'M50 6 l8 14 h-16 z', fill: 'coral', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M50 11 v5', stroke: 'paper', strokeWidth: 2.2 },
    { el: 'circle', cx: 50, cy: 18.6, r: 1.3, fill: 'paper' },
  ],

  /* ----------------------------------------------------------------- success */

  // A tick in a mint ring, with a halo. The halo is a real token at 14% — the
  // same value the canvas uses behind a success card.
  successOrder: [
    { el: 'circle', cx: 32, cy: 32, r: 26, ...HALO },
    { el: 'circle', cx: 32, cy: 32, r: 19, fill: 'mint', stroke: 'ink', strokeWidth: 2.4 },
    { el: 'path', d: 'M22.5 32 l6.5 6.5 l13.5-14', stroke: 'paper', strokeWidth: 4.2 },
    { el: 'path', d: 'M55 12 l1 2.4 2.4 1-2.4 1 L55 19 l-1-2.6-2.4-1 2.4-1 z', fill: 'amber' },
    { el: 'path', d: 'M10 20 l.8 2 2 .8-2 .8 L10 26 l-.8-2.4-2-.8 2-.8 z', fill: 'lime' },
  ],

  // Confirmed in the calendar, because that is where the user will look for it.
  successBooking: [
    { el: 'rect', x: 8, y: 12, w: 48, h: 40, rx: 7, fill: 'paper', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M8 19 a7 7 0 0 1 7-7 h34 a7 7 0 0 1 7 7 v5 H8 z', fill: 'mint' },
    { el: 'path', d: 'M8 24 h48', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M20 8 v8 M44 8 v8', stroke: 'ink', strokeWidth: 2.6 },
    { el: 'circle', cx: 32, cy: 38, r: 11, fill: 'mint', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M26 38 l4.5 4.5 l9-9.5', stroke: 'paper', strokeWidth: 3.4 },
    { el: 'path', d: 'M55 34 l.8 2 2 .8-2 .8 L55 40 l-.8-2.4-2-.8 2-.8 z', fill: 'amber' },
  ],

  // A paid card. The check sits on acid lime in INK, because the canvas lists
  // "white on lime" under Avoid at 1.15:1 and the checker rejects the pair.
  successPayment: [
    { el: 'rect', x: 5, y: 16, w: 54, h: 32, rx: 6, fill: 'paper', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M5 24 a6 6 0 0 1 6-6 h42 a6 6 0 0 1 6 6 v5 H5 z', fill: 'ink' },
    { el: 'path', d: 'M5 29 h54', stroke: 'ink', strokeWidth: 1.6, opacity: 0.4 },
    { el: 'rect', x: 12, y: 36, w: 12, h: 8, rx: 2, fill: 'amber', stroke: 'ink', strokeWidth: 1.8 },
    { el: 'path', d: 'M15 40 h6', stroke: 'ink', strokeWidth: 1.4, opacity: 0.5 },
    { el: 'path', d: 'M30 37 h9 M30 43 h6', stroke: 'ink', strokeWidth: 2, opacity: 0.32 },
    { el: 'circle', cx: 47, cy: 43, r: 9.5, fill: 'lime', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M42.5 43 l3 3 l6-6.5', stroke: 'ink', strokeWidth: 2.8 },
  ],
};

export const ILLUSTRATION_META: Record<IllustrationName, IllustrationMeta> = {
  onboardingWelcome: { kind: 'onboarding', tone: 'coral', surface: 'calm', titleAr: 'أهلاً بك في نَبض+', titleEn: 'Welcome to Nabd+' },
  onboardingBook: { kind: 'onboarding', tone: 'blue', surface: 'calm', titleAr: 'احجز موعدك', titleEn: 'Book an appointment' },
  onboardingTrack: { kind: 'onboarding', tone: 'amber', surface: 'calm', titleAr: 'تابع طلبك', titleEn: 'Track your request' },

  emptyOrders: { kind: 'empty', tone: 'blue', surface: 'neutral', titleAr: 'لا توجد طلبات', titleEn: 'No orders yet' },
  emptyBookings: { kind: 'empty', tone: 'violet', surface: 'neutral', titleAr: 'لا توجد مواعيد', titleEn: 'No appointments yet' },
  emptyCart: { kind: 'empty', tone: 'blue', surface: 'neutral', titleAr: 'السلة فارغة', titleEn: 'Your cart is empty' },
  emptyNotifications: { kind: 'empty', tone: 'amber', surface: 'neutral', titleAr: 'لا توجد إشعارات', titleEn: 'No notifications' },
  emptySearch: { kind: 'empty', tone: 'coral', surface: 'neutral', titleAr: 'لا توجد نتائج', titleEn: 'No results found' },
  emptyFamily: { kind: 'empty', tone: 'coral', surface: 'neutral', titleAr: 'أضف فرداً للعائلة', titleEn: 'Add a family member' },
  emptyReminders: { kind: 'empty', tone: 'mint', surface: 'neutral', titleAr: 'لا توجد تذكيرات', titleEn: 'No reminders' },
  emptyPrescriptions: { kind: 'empty', tone: 'violet', surface: 'neutral', titleAr: 'لا توجد روشتات', titleEn: 'No prescriptions' },

  errorOffline: { kind: 'error', tone: 'coral', surface: 'alert', titleAr: 'لا يوجد اتصال', titleEn: 'You are offline' },
  errorNotFound: { kind: 'error', tone: 'coral', surface: 'alert', titleAr: 'الصفحة غير موجودة', titleEn: 'Page not found' },
  errorServer: { kind: 'error', tone: 'coral', surface: 'alert', titleAr: 'حدث خطأ', titleEn: 'Something went wrong' },

  successOrder: { kind: 'success', tone: 'mint', surface: 'positive', titleAr: 'تم تأكيد الطلب', titleEn: 'Order confirmed' },
  successBooking: { kind: 'success', tone: 'mint', surface: 'positive', titleAr: 'تم تأكيد الموعد', titleEn: 'Appointment confirmed' },
  successPayment: { kind: 'success', tone: 'lime', surface: 'positive', titleAr: 'تم الدفع', titleEn: 'Payment complete' },
};

/** The four sections, in the order the canvas lists them. */
export const ILLUSTRATION_SECTIONS: Array<{ kind: IllustrationKind; title: string }> = [
  { kind: 'onboarding', title: 'Onboarding' },
  { kind: 'empty', title: 'Empty states' },
  { kind: 'error', title: 'Errors' },
  { kind: 'success', title: 'Success' },
];

/**
 * Illustrations obey the SAME palette rule as the icons, so the icon set's guard
 * is the one to run — pass `ILLUSTRATIONS` to it. A stray hex here would be the
 * same class of bug as a stray hex in an icon: `color.iconArt` exists precisely
 * so the artwork follows the palette. See `build-preview.mjs`, which fails the
 * build on any offender in either set.
 */
