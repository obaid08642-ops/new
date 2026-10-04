/**
 * The component contract — 12.A7.
 *
 * ONE file, no platform in it. Every component in `packages/ui/components` (web)
 * and `packages/ui-native/components` (React Native) is typed against these
 * props, which is what makes "same API" a fact about the build rather than a
 * promise in a document: if a screen changes `Button`'s props, the other
 * platform stops compiling.
 *
 * The rules this file encodes, from §A7:
 *
 *   - touch targets are never smaller than `a11y.minTouchTarget` (44px), so the
 *     size scale here is about the LABEL and the padding, never the hit area;
 *   - every component takes `state` through the same three flags — `loading`,
 *     `disabled`, `invalid` — so a screen cannot invent a fourth spelling;
 *   - spacing and radius come from the token scales and are named, never
 *     hard-coded, so `space.md` means the same 20px on both platforms;
 *   - the accessible name is always a prop called `label`, and a component that
 *     has no visible text MUST be given one. That is why `IconButton` requires
 *     it at the type level rather than documenting "remember to pass aria-label".
 *
 * There is deliberately no `href` and no `onPress` here. A link is a web
 * affordance and a press handler is a native one; each renderer adds its own
 * beyond this contract, and the docs on each component say which.
 *
 * A contract that only one platform implements is documentation, so this file is
 * CHECKED rather than trusted. `assert-contract.ts` renders every prop
 * signature here as a string and compares it with the same signature declared by
 * the web and the native component. A prop added to one renderer and forgotten
 * in the other fails `npm run check` in CI, before a screen can find out.
 */

/** Control size. Every size keeps a 44px hit area — see MIN_TOUCH. */
export type Size = 'sm' | 'md' | 'lg';

/**
 * The minimum hit area, in px, from `a11y.minTouchTarget`. Asserted against the
 * tokens in the tests, because a component that shrinks it is a component that
 * fails a user with a tremor on a 5" phone.
 */
export const MIN_TOUCH = 44;

/** Which fill/ink pair a control uses. `lime` is the acid accent, dark surfaces only. */
export type Variant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'lime';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

import type { IconName } from '../icons/names';
import type { FillIconName, ServiceName, ServiceTone } from '../icons/fill';

/**
 * A value change. Deliberately ONE name for both platforms: React Native splits
 * this into `onChangeText` and `onValueChange` with a switch between them, and a
 * screen that has to know which is which is a screen that cannot be shared with
 * the website. The renderers absorb the difference.
 *
 * A control is presentational without it — a `Stepper` that cannot be stepped —
 * so this is part of the contract rather than a platform extra.
 */
export type OnChange<T> = (value: T) => void;

/** The three flags every interactive component understands. */
export interface StateProps {
  loading?: boolean;
  disabled?: boolean;
  /** Renders the error treatment and sets the accessible invalid state. */
  invalid?: boolean;
}

export interface A11yProps {
  /**
   * The accessible name. Required for anything with no visible text; optional
   * only where visible text already provides it.
   */
  label?: string;
  /** `id` of the element describing this one (the hint, the error, the group). */
  describedBy?: string;
  testID?: string;
}

export type TextAlign = 'start' | 'center' | 'end';

/* ------------------------------------------------------------------- Button */

export interface ButtonProps extends StateProps, A11yProps {
  label: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  startIcon?: IconName;
  endIcon?: IconName;
}

/* --------------------------------------------------------------- IconButton */

export interface IconButtonProps extends StateProps, A11yProps {
  /** The glyph. */
  name: IconName;
  /** REQUIRED: an icon button has no visible text, so this cannot be optional. */
  label: string;
  size?: Size;
  variant?: 'plain' | 'outlined' | 'filled' | 'tinted';
  tone?: Tone;
}

/* ------------------------------------------------------- inputs & pickers */

export interface InputProps extends StateProps, A11yProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: OnChange<string>;
  /** Only a web input can be a textarea; the native renderer maps it to multiline. */
  multiline?: boolean;
  rows?: number;
  /** Rendered and announced; pairs with `invalid`. */
  error?: string;
  hint?: string;
  startIcon?: IconName;
  endIcon?: IconName;
  /** The native renderer maps this to a numeric keypad. */
  keyboardType?: 'text' | 'phone' | 'email' | 'number' | 'decimal';
  autoComplete?: string;
  readOnly?: boolean;
}

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends StateProps, A11yProps {
  label?: string;
  value?: string;
  onChange?: OnChange<string>;
  options: Option[];
  placeholder?: string;
  error?: string;
  hint?: string;
}

/** A segmented run of single digits. `length` is the code size, so 4 or 6. */
export interface OtpProps extends StateProps, A11yProps {
  value?: string;
  /** Required when `value` is supplied: an OTP is a controlled field, and React
   *  is right to refuse a controlled input with no way to change it. */
  onChange?: OnChange<string>;
  length: 4 | 6;
  label?: string;
  error?: string;
  /** Fired once `length` digits are present — the "user finished typing" signal,
   *  which is when an app auto-submits. Separate from `onChange`, which fires on
   *  every keystroke. */
  onComplete?: (code: string) => void;
}

export interface SearchProps extends StateProps, A11yProps {
  value?: string;
  onChange?: OnChange<string>;
  placeholder?: string;
  /** A second affordance inside the field, e.g. a filter button. */
  onFilterPress?: () => void;
  filterLabel?: string;
}

export interface StepperProps extends StateProps, A11yProps {
  value: number;
  onChange?: OnChange<number>;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  /** Decrement/increment are named so a screen reader hears "أضف"/"أنقص", not "-". */
  decrementLabel?: string;
  incrementLabel?: string;
  format?: (value: number) => string;
}

/** A bookable slot. `available: false` is rendered disabled, never removed. */
export interface Slot {
  id: string;
  /** Already formatted for display; the design system does not format times. */
  label: string;
  available?: boolean;
}

export interface SlotPickerProps extends StateProps, A11yProps {
  /** A pre-formatted day heading, e.g. "الأحد 12 أكتوبر". */
  dayLabel: string;
  slots: Slot[];
  value?: string;
  onChange?: OnChange<string>;
}

/* ------------------------------------------------------- chips, tags, cards */

export interface ChipProps extends StateProps, A11yProps {
  label: string;
  tone?: Tone;
  variant?: 'soft' | 'solid' | 'outline';
  startIcon?: IconName;
  onDismissLabel?: string;
  selected?: boolean;
}

/** A short status marker with no label of its own — a dot, a count, a trend. */
export interface BadgeProps extends A11yProps {
  /** The number or short text inside. */
  content: string | number;
  tone?: Tone;
  /** Above 99 the badge caps at "99+" so a four-digit count cannot widen a tab bar. */
  max?: number;
}

export interface CardProps extends A11yProps {
  title?: string;
  subtitle?: string;
  /** `flat` for a sunken list row, `raised` for a sheet, `glass` is A8's job. */
  elevation?: 'flat' | 'card' | 'raised';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  footer?: string;
}

export interface ListItemProps extends StateProps, A11yProps {
  title: string;
  subtitle?: string;
  /** Trailing text — a price, a time, a count. */
  meta?: string;
  startIcon?: IconName;
  endIcon?: IconName;
  endContent?: 'none' | 'chevron' | 'check' | 'switch';
  onEndPressLabel?: string;
  selected?: boolean;
  /** A 40px <FIcon> at the start (canvas/Account.dc.html rows). Takes the place of `startIcon`. */
  leading?: { icon: FillIconName; tone: ServiceTone };
}

/**
 * The home-screen service tile (handoff §1 and canvas/HomeApp.dc.html): the
 * service's filled icon in its tinted square (<FIcon>, from the service map) over
 * a text label. The label names the tile; the icon is decorative.
 */
export interface ServiceTileProps extends StateProps, A11yProps {
  /** A service of the handoff service map; it fixes the icon and the tone. */
  name: ServiceName;
  label: string;
  /** Icon chip edge: sm 44, md 50 (the canvas home), lg 56. */
  size?: 'sm' | 'md' | 'lg';
  badge?: string | number;
}

/**
 * A filled Phosphor icon in a soft-tinted rounded square (radius 32% of its edge),
 * handoff §1 "Icons". 40–58 in lists and grids, 72–112 for empty states.
 * Decorative unless `label` is given.
 */
export interface FIconProps extends A11yProps {
  icon: FillIconName;
  tone: ServiceTone;
  /** Edge in px. */
  size?: number;
  /** `soft` tinted square (default), `solid` gradient with a white glyph, `none` the bare glyph. */
  chip?: 'soft' | 'solid' | 'none';
}

/** A section title with an optional "see all" link (canvas/HomeApp.dc.html). */
export interface SectionHeaderProps extends A11yProps {
  title: string;
  /** Visible text of the trailing action, e.g. "عرض الكل". */
  actionLabel?: string;
  /** Heading level for the document outline; the look does not change. */
  level?: 2 | 3;
}

export interface AvatarProps extends A11yProps {
  /** A person or family member name. */
  name: string;
  size?: Size;
  /** An illustrated role, when the person is a provider rather than a user. */
  illustratedName?: string;
  /** Shows a small state marker: verified, offline, needs attention. */
  status?: 'none' | 'online' | 'offline' | 'alert';
}

export interface PriceTagProps extends A11yProps {
  amount: string;
  currency?: string;
  /** The pre-discount amount, struck through by the renderer. */
  was?: string;
  note?: string;
}

/**
 * A rating. `value` is a real measured number and `count` how many rated it —
 * there is no "seed" or "sample" mode, because a rating with no count is a lie
 * rendered as a star row.
 */
export interface RatingProps extends A11yProps {
  value: number;
  count?: number;
  max?: number;
  size?: 'sm' | 'md';
  /** Supplied by the caller so the sentence is localised by the app, not here. */
  formatLabel?: (value: number, count?: number) => string;
}

/* ------------------------------------------------------------- navigation */

export interface TabItem {
  id: string;
  label: string;
  icon: IconName;
  /** A small count or dot, e.g. unread messages. */
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps extends A11yProps {
  items: TabItem[];
  value: string;
  onChange?: OnChange<string>;
  /** `line` for a page header, `segmented` for a filter row. */
  variant?: 'line' | 'segmented';
  fullWidth?: boolean;
}

export interface NavBarProps extends A11yProps {
  title: string;
  /** A back affordance; its accessible name is required when present. */
  showBack?: boolean;
  backLabel?: string;
  actions?: Array<{ name: IconName; label: string; disabled?: boolean }>;
}

export interface BottomTabBarProps extends A11yProps {
  items: TabItem[];
  value: string;
  onChange?: OnChange<string>;
  /** The web renders this as a nav; native as a tab bar. */
  safeAreaInset?: boolean;
}

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: IconName;
  badge?: string | number;
  disabled?: boolean;
}

export interface SidebarProps extends A11yProps {
  title: string;
  items: SidebarNavItem[];
  value: string;
  onChange?: OnChange<string>;
  /** A web/admin-only affordance; ignored by the native renderer. */
  collapsible?: boolean;
  collapsed?: boolean;
}

export interface MapPinCardProps extends StateProps, A11yProps {
  title: string;
  /** Coordinates are data, not decoration, so they are strings the app formats. */
  address?: string;
  distance?: string;
  actionLabel?: string;
  startIcon?: IconName;
}

/* --------------------------------------------------------- status & dialogs */

export interface EmptyStateProps extends A11yProps {
  /** An `ILLUSTRATION_NAME`. The picture says "nothing here" in any language. */
  illustration: string;
  title: string;
  body?: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
}

export interface ErrorStateProps extends StateProps, A11yProps {
  /** An `ILLUSTRATION_NAME` from the error set. */
  illustration?: string;
  title: string;
  body?: string;
  /** The technical cause, for support. Rendered small, never as the title. */
  detail?: string;
  actionLabel?: string;
  retryLabel?: string;
}

export interface ToastProps extends A11yProps {
  message: string;
  tone?: Tone;
  /** A toast is transient; `dismissible` adds the close affordance. */
  dismissible?: boolean;
  dismissLabel?: string;
  actionLabel?: string;
  durationMs?: number;
}

export interface ModalProps extends StateProps, A11yProps {
  open: boolean;
  title: string;
  body?: string;
  /** `sheet` slides from the bottom edge — the mobile shape of the same thing. */
  variant?: 'modal' | 'sheet' | 'dialog';
  confirmLabel: string;
  cancelLabel?: string;
  /** A destructive confirm asks twice. */
  destructive?: boolean;
  closeLabel: string;
}

/** The loading placeholder. Never a spinner inside a list that already has one. */
export interface SkeletonProps extends A11yProps {
  variant?: 'text' | 'title' | 'block' | 'circle' | 'tile';
  /** Rendered lines when `variant` is text or title. */
  lines?: number;
  width?: 'auto' | 'full' | 'half';
}

/* ------------------------------------------------ admin-only (web wrappers) */

export interface Column<T> {
  key: string;
  header: string;
  /** Right-aligns a numeric column; the renderer owns the direction. */
  numeric?: boolean;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => string;
}

export interface DataTableProps<T> extends StateProps, A11yProps {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Set when the server is paging, so the footer can say so honestly. */
  loadingMore?: boolean;
  emptyMessage: string;
  caption: string;
}

export interface ChartCardProps extends A11yProps {
  title: string;
  subtitle?: string;
  /** A data/aria summary; a chart with no text alternative is a picture. */
  summary: string;
  legend?: Array<{ label: string; value: string }>;
}

/* ---------------------------------------------------------------- the roster */

/**
 * Every component this contract covers, name to props.
 *
 * This roster is the thing the conformance check iterates, and it is also what
 * the component gallery in `build-preview.mjs` renders. A component that is not
 * listed here is not part of 12.A7, and adding one without a contract prop type
 * fails the check — so "we added a component" cannot quietly mean "we added
 * something the other platform has to guess at".
 */
export interface ContractMap {
  Button: ButtonProps;
  IconButton: IconButtonProps;
  Input: InputProps;
  Select: SelectProps;
  Otp: OtpProps;
  Search: SearchProps;
  Stepper: StepperProps;
  SlotPicker: SlotPickerProps;
  Chip: ChipProps;
  Badge: BadgeProps;
  Card: CardProps;
  ListItem: ListItemProps;
  ServiceTile: ServiceTileProps;
  FIcon: FIconProps;
  SectionHeader: SectionHeaderProps;
  Avatar: AvatarProps;
  PriceTag: PriceTagProps;
  Rating: RatingProps;
  Tabs: TabsProps;
  NavBar: NavBarProps;
  BottomTabBar: BottomTabBarProps;
  Sidebar: SidebarProps;
  MapPinCard: MapPinCardProps;
  EmptyState: EmptyStateProps;
  ErrorState: ErrorStateProps;
  Toast: ToastProps;
  Modal: ModalProps;
  Skeleton: SkeletonProps;
  DataTable: DataTableProps<Record<string, unknown>>;
  ChartCard: ChartCardProps;
}

export type ContractName = keyof ContractMap;

/**
 * The components a renderer is ALLOWED not to have, and why.
 *
 * §A7 ends with "DataTable + Chart wrappers (admin)", so these two are part of
 * the contract — and the contract is about the whole product, not the part that
 * happens to be a website. A data table on a phone is a list, and a chart on a
 * phone is a number with a label; building desktop-shaped components for a
 * 360px viewport would be worse than not building them.
 *
 * The exclusion is declared HERE rather than quietly omitted from the native
 * prop map, because a silent omission is indistinguishable from a component
 * somebody forgot. Naming it means the conformance check can report it if the
 * list ever grows without a reason, and it puts the "why" in the same file as
 * the requirement.
 */
// Typed `Partial<Record<ContractName, string>>` on purpose. An earlier version
// intersected it with a full Record, which made `keyof typeof WEB_ONLY` equal
// to EVERY contract name — so `RequiredBy<'native'>` collapsed to `never` and the
// native conformance check passed without looking at anything. A partial record
// gives exactly the two keys it lists, so the check stays a check.
export const WEB_ONLY = {
  DataTable: 'Admin-only: a data table on a phone is a list, and a horizontally scrolling grid of numbers is not usable at 360px.',
  ChartCard: 'Admin-only: a chart needs a legend and a summary a screen reader can read, and neither survives a 128px tile.',
} satisfies Partial<Record<ContractName, string>>;

export type WebOnlyName = keyof typeof WEB_ONLY;

/** The contract components a renderer must implement. */
export type RequiredBy<Platform extends 'web' | 'native'> = {
  [K in ContractName]: Platform extends 'web' ? K : K extends keyof typeof WEB_ONLY ? never : K;
}[ContractName];

export type WebRequired = RequiredBy<'web'>;
export type NativeRequired = RequiredBy<'native'>;

/** The names, for iteration in the gallery and the conformance check. */
export const CONTRACT_NAMES = [
  'Button', 'IconButton', 'Input', 'Select', 'Otp', 'Search', 'Stepper',
  'SlotPicker', 'Chip', 'Badge', 'Card', 'ListItem', 'ServiceTile', 'FIcon', 'SectionHeader', 'Avatar',
  'PriceTag', 'Rating', 'Tabs', 'NavBar', 'BottomTabBar', 'Sidebar',
  'MapPinCard', 'EmptyState', 'ErrorState', 'Toast', 'Modal', 'Skeleton',
  'DataTable', 'ChartCard',
] as const satisfies readonly ContractName[];
