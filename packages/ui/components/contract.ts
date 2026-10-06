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

/**
 * Which fill/ink pair a control uses. `primary` is the handoff coral gradient
 * (PrimaryButton), `outline` the 1.5px ink outline (OutlineButton). `lime` is the
 * acid accent, dark surfaces only.
 */
export type Variant =
  | 'primary'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'lime';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

import type { ReactNode } from 'react';

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

/**
 * The handoff buttons (canvas/Cart, CheckoutV2, Consult, HomeWeb …):
 *   lg  56 tall, radius 18, 17/700 — the page CTA in a StickyFooter;
 *   md  44 tall, radius 14, 14/600;
 *   sm  40 tall, radius 14, 13.5/600 (still a 44 hit area).
 */
export interface ButtonProps extends StateProps, A11yProps {
  label: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  /** A filled glyph of the handoff set (icons/fill.ts, e.g. "image") wins over a line icon of the same name. */
  startIcon?: IconName | FillIconName;
  endIcon?: IconName | FillIconName;
}

/* --------------------------------------------------------------- IconButton */

export interface IconButtonProps extends StateProps, A11yProps {
  /** The glyph. */
  name: IconName;
  /** REQUIRED: an icon button has no visible text, so this cannot be optional. */
  label: string;
  /** sm and md are 44×44 (canvas/Settings back button); lg is 52×52 (the filter square of Consult, PharmacyHub). */
  size?: Size;
  /**
   * `outlined` is the board header button: surface fill with a hairline ring.
   * `filled` is the ink square/disc (Consult filter). `glass` sits over a photo
   * (ProductFull). `plain` and `tinted` have no ring.
   */
  variant?: 'plain' | 'outlined' | 'filled' | 'tinted' | 'glass';
  /** `circle` (default) or the rounded `square` of the board's filter button. */
  shape?: 'circle' | 'square';
  tone?: Tone;
}

/* ---------------------------------------------------------------- controls */

/**
 * A segmented choice (handoff §3; canvas/Settings, Orders, CheckoutV2): a
 * `control.segmentedTrack` track, the selected item a raised surface pill.
 * md items are 44 tall, sm items 38 (with a 44 hit area).
 */
export interface SegmentedProps extends StateProps, A11yProps {
  options: Option[];
  value: string;
  onChange?: OnChange<string>;
  /** REQUIRED: the name of the group, e.g. "المظهر". */
  label: string;
  size?: 'sm' | 'md';
}

/** An on/off switch (canvas/Settings, Cart): 50×30, green when on, 44 hit area. */
export interface ToggleProps extends StateProps, A11yProps {
  value: boolean;
  onChange?: OnChange<boolean>;
  /** REQUIRED: what the switch turns on, e.g. "تذكير الأدوية". */
  label: string;
}

/**
 * One choice of a radio group, as a row (canvas/Settings language list): the
 * label, an optional meta text, and the 22px ring (7px coral when selected).
 * Put the rows inside an element with role="radiogroup" and a name.
 */
export interface RadioProps extends StateProps, A11yProps {
  label: string;
  /** Secondary text at the end of the row, e.g. the language's English name. */
  meta?: string;
  selected: boolean;
  /** Called with `true` when the row is chosen. */
  onChange?: OnChange<boolean>;
}

/**
 * A status pill (canvas/Orders: "في الطريق", "تم التوصيل"): 26 tall, the tone's
 * soft background with its ink. It states a real status from the API; it is not
 * a button.
 */
export interface StatusChipProps extends A11yProps {
  label: string;
  tone: ServiceTone;
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

/**
 * The search field (handoff SearchField). `inline` is the hub field (PharmacyHub,
 * Consult: 52 tall, radius 18, hairline); `page` is the focused field of the
 * Search screen (50 tall pill, 2px ink border and a soft ring). Both take the
 * ink ring while focused.
 */
export interface SearchProps extends StateProps, A11yProps {
  value?: string;
  onChange?: OnChange<string>;
  placeholder?: string;
  variant?: 'inline' | 'page';
  /** The ink filter square beside the field (Consult). */
  onFilterPress?: () => void;
  filterLabel?: string;
  /** The clear button, shown while there is text. */
  onClear?: () => void;
  clearLabel?: string;
  /** The barcode button inside the field (PharmacyHub, Search). */
  onScanPress?: () => void;
  scanLabel?: string;
}

export interface StepperProps extends StateProps, A11yProps {
  value: number;
  onChange?: OnChange<number>;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  /**
   * Decrement/increment are named so a screen reader hears "أضف"/"أنقص", not "-".
   * canvas/Cart: a 36 tall canvas-coloured pill with two 30px surface discs
   * (each a 44 hit area) around the value.
   */
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

/**
 * A filter chip (canvas/Search): 38 tall pill, surface with a subtle border, or
 * ink when selected. For a status use <StatusChip>.
 */
export interface ChipProps extends StateProps, A11yProps {
  label: string;
  /** A real count next to the label, e.g. results in that category. */
  count?: string | number;
  startIcon?: IconName;
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

/**
 * The board card (canvas/OrderTracking, Cart, CareHub …): surface, radius 24, a
 * hairline ring and the soft card shadow. `tint` is the hero card of HomeApp and
 * CareHub: a 160° wash from the surface into the tone's soft colour.
 * Padding: sm 14, md 16, lg 18 (the boards' three).
 */
export interface CardProps extends A11yProps {
  title?: string;
  subtitle?: string;
  /** `flat` drops the shadow, `raised` is a sheet. */
  elevation?: 'flat' | 'card' | 'raised';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  footer?: string;
  tint?: ServiceTone;
  children?: ReactNode;
}

/** How a doctor can be seen (owner 2026-10-04: clinic, home visit, and one call product). */
export type ConsultMode = 'clinic' | 'home' | 'online';

/**
 * DoctorCard (handoff §3, canvas/Consult.dc.html): the organic photo shape with
 * the doctor's real photo (or the neutral placeholder), name with the verified
 * seal, grade, specialty, place, the visit modes, and the coral footer with the
 * rating, the next slot, the price and the book button.
 *
 * Every optional field is hidden when it is absent: no default, sample or
 * invented value (handoff §1; owner 2026-10-04 on doctor fields).
 */
export interface DoctorCardProps extends A11yProps {
  name: string;
  /** A real photo URL (`photo_url`). Without it, the neutral user mark on the tone. */
  photoSrc?: string;
  /** The soft colour behind the photo. */
  tone?: ServiceTone;
  /** Accessible name of the seal, e.g. "موثّق"; the seal shows only with it. */
  verifiedLabel?: string;
  /** Accessible name of the "available now" dot; the dot shows only with it. */
  availableLabel?: string;
  /** e.g. "استشاري". */
  grade?: string;
  specialty?: string;
  /** Clinic or hospital, with the distance when known, already formatted. */
  place?: string;
  modes?: Array<{ mode: ConsultMode; label: string }>;
  rating?: { value: number | null; count: number };
  /** Already formatted, e.g. "اليوم ٧:٣٠ م". */
  nextSlot?: string;
  price?: string;
  currency?: string;
  bookLabel: string;
}

/**
 * ProductCard (canvas/PharmacyHub.dc.html): the product image on the media
 * colour, an optional discount badge, name, maker and pack, price, an optional
 * prescription note, and the ink add-to-cart button (named by `addLabel`).
 */
export interface ProductCardProps extends StateProps, A11yProps {
  name: string;
  /** e.g. "[الشركة] · [العبوة]". */
  meta?: string;
  price: string;
  currency?: string;
  imageSrc?: string;
  /** e.g. "خصم ١٥٪", from the API's real discount. */
  discountLabel?: string;
  /** e.g. "يحتاج وصفة". */
  rxLabel?: string;
  /** REQUIRED: the add button has no visible text. */
  addLabel: string;
}

/**
 * OfferCard (canvas/HomeApp.dc.html "عروض وباقات"): a 112 tall tinted head with
 * the tone's filled icon and a tag, then the title, the provider, and the price
 * in the price colour with the struck-through old price.
 */
export interface OfferCardProps extends A11yProps {
  title: string;
  provider?: string;
  price: string;
  currency?: string;
  was?: string;
  tag?: string;
  icon: FillIconName;
  tone: ServiceTone;
}

/** One step of a Timeline. */
export interface TimelineStep {
  id: string;
  label: string;
  /** Already formatted; omitted for a step that has not happened. */
  time?: string;
  state: 'done' | 'current' | 'upcoming';
}

/**
 * Timeline (canvas/OrderTracking.dc.html): done steps are coral dots with a
 * check joined by a coral line, the current step a larger dot with a soft halo,
 * upcoming steps hollow grey dots with muted labels.
 */
export interface TimelineProps extends A11yProps {
  steps: TimelineStep[];
}

/**
 * ProgressRing (canvas/CareHub.dc.html): a 10-wide arc in the tone over its soft
 * track, with a value and a caption in the centre. `value` is 0..1 of a real
 * measure; the ring is a progressbar named by `label`.
 */
export interface ProgressRingProps extends A11yProps {
  value: number;
  tone: ServiceTone;
  /** REQUIRED: what is being measured, e.g. "أسبوع الحمل ٢٢ من ٤٠". */
  label: string;
  size?: number;
  /** Large text in the centre, e.g. "٢٢". */
  valueText?: string;
  /** Small text under it, e.g. "أسبوع". */
  caption?: string;
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
  /** A person or family member name. Empty draws the neutral user icon. */
  name: string;
  size?: Size;
  /**
   * A real photo URL (e.g. a doctor's `photo_url`). Without one the avatar shows the
   * initials, or the neutral user icon when there is no name. No cartoon or
   * illustrated people (handoff §1).
   */
  src?: string;
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
/**
 * A compact rating as on the DoctorCard board: ONE filled star, the value, and the
 * count in brackets. It renders nothing unless there are real ratings
 * (`count > 0` and a value), so a screen can never show an empty-star row or a
 * bare count (handoff §1: no fake ratings).
 */
export interface RatingProps extends A11yProps {
  value: number | null;
  count: number;
  max?: number;
  size?: 'sm' | 'md';
  /** `onBrand` on the coral DoctorCard footer; `default` on a surface. */
  surface?: 'default' | 'onBrand';
  /** Supplied by the caller so the sentence is localised by the app, not here. */
  formatLabel?: (value: number, count: number) => string;
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

/** One item of the main tab bar: a filled glyph of the handoff set (canvas/HomeApp). */
export interface BottomTabItem {
  id: string;
  label: string;
  icon: FillIconName;
  /** The raised coral centre button (Consultations). At most one item. */
  raised?: boolean;
  badge?: string | number;
  disabled?: boolean;
}

/**
 * The main tab bar, exactly as canvas/HomeApp.dc.html (design review 2026-10-04):
 * a floating glass pill 68 tall, the active item an ink pill with its icon and
 * label, and the raised 66 coral Consultations button in the centre. Every item
 * is named by its label. Native renders the DEVICE_STANDARD shell TabBar.
 */
export interface BottomTabBarProps extends A11yProps {
  items: BottomTabItem[];
  value: string;
  onChange?: OnChange<string>;
  /** Web: add the bottom safe-area inset below the bar (leave off inside AppShell, which pads for it). */
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

/**
 * The state screens of canvas/States.dc.html (handoff §3 EmptyState / ErrorState /
 * OfflineState): a 112 soft FIcon, a 22/700 title, the body, a full-width primary
 * button and an optional text button, centred. The handoff's filled icon replaces
 * the 12.A6 illustration here (handoff §1: 72–112 icons for empty states).
 */
export interface EmptyStateProps extends A11yProps {
  /** e.g. `package` (empty cart), `magnifying-glass` (404). */
  icon: FillIconName;
  tone: ServiceTone;
  title: string;
  body?: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
}

/** An error the user can act on. Announced (role alert); `detail` is small and never the title. */
export interface ErrorStateProps extends StateProps, A11yProps {
  /** Defaults to `warning` in amber, as on the board. */
  icon?: FillIconName;
  tone?: ServiceTone;
  title: string;
  body?: string;
  /** The technical cause, for support. Rendered small, never as the title. */
  detail?: string;
  actionLabel?: string;
  retryLabel?: string;
}

/** No connection (canvas/States): the wifi-slash icon in blue, the body and a retry. */
export interface OfflineStateProps extends StateProps, A11yProps {
  title: string;
  body?: string;
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
  Segmented: SegmentedProps;
  Toggle: ToggleProps;
  Radio: RadioProps;
  StatusChip: StatusChipProps;
  Input: InputProps;
  Select: SelectProps;
  Otp: OtpProps;
  Search: SearchProps;
  Stepper: StepperProps;
  SlotPicker: SlotPickerProps;
  Chip: ChipProps;
  Badge: BadgeProps;
  Card: CardProps;
  DoctorCard: DoctorCardProps;
  ProductCard: ProductCardProps;
  OfferCard: OfferCardProps;
  Timeline: TimelineProps;
  ProgressRing: ProgressRingProps;
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
  OfflineState: OfflineStateProps;
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
  'Button', 'IconButton', 'Segmented', 'Toggle', 'Radio', 'StatusChip', 'Input', 'Select', 'Otp', 'Search', 'Stepper',
  'SlotPicker', 'Chip', 'Badge', 'Card', 'DoctorCard', 'ProductCard', 'OfferCard', 'Timeline', 'ProgressRing', 'ListItem', 'ServiceTile', 'FIcon', 'SectionHeader', 'Avatar',
  'PriceTag', 'Rating', 'Tabs', 'NavBar', 'BottomTabBar', 'Sidebar',
  'MapPinCard', 'EmptyState', 'ErrorState', 'OfflineState', 'Toast', 'Modal', 'Skeleton',
  'DataTable', 'ChartCard',
] as const satisfies readonly ContractName[];
