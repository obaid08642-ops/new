/**
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
