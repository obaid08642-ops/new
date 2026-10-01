/**
// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/icons/names.ts by tools/design/sync-ui-components.mjs.
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
 * The icon NAMES — 12.A7.
 *
 * The name union lives here rather than in either renderer, because a name is
 * platform-free: `bell` is `bell` on a `<button>` and on a `<Pressable>`. Both
 * `Icon` implementations map from this one list, so the curated set cannot grow
 * on the web and stay missing on native.
 *
 * Two families, kept apart on purpose, exactly as the canvas states:
 *
 *   - **illustrated** — the flat brand artwork from `./illustrated`, for service
 *     tiles, category tiles, avatars and empty states. Nine names.
 *   - **line** — one Phosphor *regular* set for the small UI inside buttons,
 *     lists and the tab bar, where illustrated artwork is too heavy at 20px.
 *     29 names, one weight, no per-screen additions.
 *
 * A component that needs a twenty-first line icon adds it here and to both
 * renderers' maps, and the conformance check makes sure the second half happens.
 */

import { ILLUSTRATED_ICONS, type IllustratedIcon } from './illustrated';

/** The Phosphor component each line name maps to. One weight: `regular`. */
export const LINE_ICON_COMPONENTS = {
  bell: 'Bell',
  calendar: 'CalendarBlank',
  search: 'MagnifyingGlass',
  cart: 'ShoppingCart',
  user: 'User',
  users: 'UsersThree',
  home: 'House',
  heart: 'Heart',
  clock: 'Clock',
  pin: 'MapPin',
  phone: 'Phone',
  card: 'CreditCard',
  star: 'Star',
  check: 'Check',
  'check-circle': 'CheckCircle',
  close: 'X',
  plus: 'Plus',
  minus: 'Minus',
  filter: 'Funnel',
  settings: 'Gear',
  list: 'List',
  download: 'DownloadSimple',
  trash: 'Trash',
  warning: 'Warning',
  signout: 'SignOut',
  'caret-down': 'CaretDown',
  'caret-up': 'CaretUp',
  'caret-left': 'CaretLeft',
  'caret-right': 'CaretRight',
  'shield-check': 'ShieldCheck',
  'calendar-days': 'CalendarDots',
  'arrow-right': 'ArrowRight',
  'arrow-left': 'ArrowLeft',
  pill: 'Pill',
  activity: 'Pulse',
  'file-text': 'FileText',
  sparkle: 'Sparkle',
  'message-circle': 'ChatCircleDots',
  stethoscope: 'Stethoscope',
  building2: 'Buildings',
  'heart-pulse': 'Heartbeat',
  'flask-conical': 'Flask',
  'users-round': 'UsersThree',
  'lock-keyhole': 'LockKey',
  'check-circle2': 'CheckCircle',
  gift: 'Gift',
  truck: 'Truck',
  siren: 'Siren',
  'refresh-cw': 'ArrowClockwise',
  moon: 'Moon',
  'book-open': 'BookOpen',
  'clipboard-list': 'ClipboardText',
  'scan-line': 'Scan',
  'alert-circle': 'WarningCircle',
  'circle-alert': 'WarningCircle',
  'shopping-bag': 'ShoppingBag',
  brain: 'Brain',
  flame: 'Flame',
  target: 'Target',
  utensils: 'ForkKnife',
  baby: 'Baby',
  tag: 'Tag',
  lock: 'Lock',
  fingerprint: 'Fingerprint',
  'hard-drive': 'HardDrive',
  camera: 'Camera',
  bookmark: 'Bookmark',
  'qr-code': 'QrCode',
  coins: 'Coins',
  history: 'ClockCounterClockwise',
  send: 'PaperPlaneTilt',
  headphones: 'Headphones',
  mic: 'Microphone',
  share2: 'ShareNetwork',
  factory: 'Factory',
  package: 'Package',
  info: 'Info',
  'arrow-up-right': 'ArrowUpRight',
  'arrow-up-left': 'ArrowUpLeft',
  'map-pinned': 'MapPinArea',
  'rotate-ccw': 'ArrowCounterClockwise',
  volume2: 'SpeakerHigh',
  vibrate: 'Vibrate',
  'bell-ring': 'BellRinging',
  'test-tube2': 'TestTube',
  database: 'Database',
  'house-plus': 'HouseLine',
  'loader-circle': 'CircleNotch',
  loader2: 'CircleNotch',
  'user-round': 'User',
  'user-round-plus': 'UserPlus',
  'git-compare-arrows': 'GitDiff',
  'sliders-horizontal': 'SlidersHorizontal',
  'x-circle': 'XCircle',
  'trending-up': 'TrendUp',
  'trending-down': 'TrendDown',
  'package-search': 'Package',
  'package-check': 'Package',
  hash: 'Hash',
  bot: 'Robot',
  'message-square-quote': 'ChatCenteredText',
} as const;

export type LineIconName = keyof typeof LINE_ICON_COMPONENTS;

export const LINE_ICON_NAMES = Object.keys(LINE_ICON_COMPONENTS) as LineIconName[];

/** Everything `<Icon>` accepts, and therefore everything a component's `icon`
 *  prop may be set to. */
export type IconName = IllustratedIcon | LineIconName;

export const ICON_NAMES: readonly IconName[] = [...ILLUSTRATED_ICONS, ...LINE_ICON_NAMES];

/** True when a string is a name this design system knows. Used by the tests to
 *  check a screen is not inventing a glyph. */
export function isIconName(value: string): value is IconName {
  return (ICON_NAMES as readonly string[]).includes(value);
}
