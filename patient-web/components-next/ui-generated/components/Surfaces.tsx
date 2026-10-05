"use client";

// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/components/Surfaces.tsx by tools/design/sync-ui-components.mjs.
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
import * as React from 'react';

import type {
  AvatarProps,
  BadgeProps,
  BottomTabBarProps,
  CardProps,
  ChipProps,
  ListItemProps,
  MapPinCardProps,
  NavBarProps,
  PriceTagProps,
  RatingProps,
  SectionHeaderProps,
  ServiceTileProps,
  SidebarProps,
  TabItem,
  TabsProps,
  Tone,
} from './contract';
import { Icon, IllustratedIconView } from '../src/Icon';
import { FIcon } from './FIcon';
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, SERVICE_ICONS } from '../icons/fill';

/**
 * The layout and navigation surfaces — 12.A7, web.
 *
 * `displayName` on every one of these, because several of them are landmarks and
 * a screen reader is entitled to say "navigation" rather than "group". The tab
 * sets carry `role="tablist"` / `role="tab"` with roving focus, which is what
 * makes arrow keys move between them — a row of buttons only responds to Tab,
 * and a five-item tab bar is five stops in a keyboard user's day.
 */

/** A tone resolves to two colours: the ink and the surface it sits on. */
type TonePair = { fg: string; bg: string };

const TONE_STYLE: Record<Tone, TonePair> = {
  neutral: { fg: 'var(--nabd-color-text-secondary)', bg: 'var(--nabd-color-bg-sunken)' },
  primary: { fg: 'var(--nabd-color-text-primary)', bg: 'var(--nabd-color-bg-sunken)' },
  success: { fg: 'var(--nabd-color-status-success-fg)', bg: 'var(--nabd-color-status-success-bg)' },
  warning: { fg: 'var(--nabd-color-status-warning-fg)', bg: 'var(--nabd-color-status-warning-bg)' },
  danger: { fg: 'var(--nabd-color-status-danger-fg)', bg: 'var(--nabd-color-status-danger-bg)' },
  info: { fg: 'var(--nabd-color-status-info-fg)', bg: 'var(--nabd-color-status-info-bg)' },
};

const NO_UNDERLINE: React.CSSProperties = {
  textDecoration: 'none',
  color: 'inherit',
};

/* ------------------------------------------------------------------- chips */

export interface WebChipProps extends ChipProps {
  onClick?: () => void;
}

/**
 * The filter chip of canvas/Search: 38 tall (44 hit area), radius 19, 14px; a
 * surface pill with a subtle border, or ink with a bold label when selected. A
 * count rides after the label at 12px. It is a toggle button (`aria-pressed`).
 */
export function Chip({ label, count, startIcon, selected = false, loading = false, disabled = false, invalid = false, describedBy, testID, onClick }: WebChipProps) {
  const inert = disabled || loading;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      disabled={inert}
      onClick={inert ? undefined : onClick}
      data-testid={testID}
      style={{
        // 38 visual, 44 hit: the extra 3px each side is given back to the layout
        height: 44,
        marginBlock: -3,
        padding: 0,
        border: 0,
        background: 'transparent',
        fontFamily: 'inherit',
        flexShrink: 0,
        cursor: inert ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          height: 38,
          boxSizing: 'border-box',
          paddingInline: 14,
          borderRadius: 19,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
          fontSize: '14px',
          fontWeight: selected ? 700 : 500,
          background: selected ? 'var(--nabd-color-action-selected-bg)' : 'var(--nabd-color-bg-surface)',
          color: selected ? 'var(--nabd-color-action-selected-fg)' : 'var(--nabd-color-text-primary)',
          border: selected ? 0 : '1px solid var(--nabd-color-border-subtle)',
        }}
      >
        {startIcon ? <Icon name={startIcon} size={16} tone="currentColor" /> : null}
        {label}
        {count !== undefined ? <span style={{ fontSize: '12px', opacity: 0.7 }}>{count}</span> : null}
      </span>
    </button>
  );
}

/**
 * A count with no label of its own. It caps at 99 so a four-digit number cannot
 * widen a tab bar, and it is `aria-hidden` with the number moved into an
 * `aria-label` on the parent, because "142" announced next to a tab called
 * "Messages" is read as a bare number with nothing to attach to.
 */
export function Badge({ content, tone = 'danger', max = 99, testID }: BadgeProps) {
  const n = typeof content === 'number' ? content : Number.parseInt(content, 10);
  const shown = Number.isFinite(n) && n > max ? `${max}+` : String(content);

  return (
    <span
      data-testid={testID}
      aria-hidden
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        minWidth: 20,
        height: 20,
        paddingInline: 5,
        borderRadius: 'var(--nabd-radius-pill)',
        fontSize: 'var(--nabd-font-size-micro)',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        background: TONE_STYLE[tone].fg,
        color: 'var(--nabd-color-action-secondary-fg)',
      }}
    >
      {shown}
    </span>
  );
}

/* ------------------------------------------------------------------- cards */

export function Card({
  title,
  subtitle,
  elevation = 'card',
  padding = 'md',
  footer,
  tint,
  children,
  testID,
}: CardProps) {
  // canvas/OrderTracking (16), Cart (14), CareHub (18)
  const pad = { none: 0, sm: 14, md: 16, lg: 18 }[padding];

  return (
    <section
      data-testid={testID}
      data-tint={tint}
      style={{
        background: tint
          ? `linear-gradient(160deg, var(--nabd-color-bg-surface) 0%, var(--nabd-color-service-${tint}-bg) 100%)`
          : 'var(--nabd-color-bg-surface)',
        border: tint
          ? `1px solid color-mix(in srgb, var(--nabd-color-service-${tint}-fg) 10%, transparent)`
          : '1px solid var(--nabd-color-border-hairline)',
        borderRadius: tint ? 28 : 24,
        boxShadow: elevation === 'raised' ? 'var(--nabd-shadow-raised)' : elevation === 'card' && !tint ? 'var(--nabd-shadow-card)' : 'none',
        padding: pad,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        color: 'var(--nabd-color-text-primary)',
      }}
    >
      {title || subtitle ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {title ? <h3 style={{ margin: 0, fontSize: 'var(--nabd-font-size-body)', fontWeight: 700 }}>{title}</h3> : null}
          {subtitle ? <p style={{ margin: 0, fontSize: 'var(--nabd-font-size-label)', color: 'var(--nabd-color-text-secondary)' }}>{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
      {footer ? (
        <div
          style={{
            paddingTop: 12,
            borderTop: '1px solid var(--nabd-color-border-subtle)',
            fontSize: 'var(--nabd-font-size-caption)',
            color: 'var(--nabd-color-text-secondary)',
          }}
        >
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export function ListItem({
  title,
  subtitle,
  meta,
  startIcon,
  endIcon,
  endContent = 'chevron',
  onEndPressLabel,
  selected = false,
  disabled = false,
  loading = false,
  leading,
  testID,
}: ListItemProps) {
  return (
    <div
      data-testid={testID}
      aria-current={selected ? 'true' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--nabd-space-sm)',
        minHeight: 'var(--nabd-a11y-minTouchTarget)',
        paddingInline: 'var(--nabd-space-md)',
        paddingBlock: 'var(--nabd-space-2xs)',
        background: selected ? 'var(--nabd-color-action-selected-bg)' : 'transparent',
        opacity: disabled ? 0.5 : 1,
        borderRadius: 'var(--nabd-radius-md)',
      }}
    >
      {leading ? <FIcon icon={leading.icon} tone={leading.tone} size={40} /> : startIcon ? <Icon name={startIcon} size={20} tone="secondary" /> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--nabd-font-size-body)', fontWeight: 600, color: 'var(--nabd-color-text-primary)', overflowWrap: 'anywhere' }}>{title}</div>
        {subtitle ? (
          <div style={{ fontSize: 'var(--nabd-font-size-caption)', color: 'var(--nabd-color-text-secondary)' }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {meta ? (
        <span style={{ fontSize: 'var(--nabd-font-size-body)', fontVariantNumeric: 'tabular-nums', color: 'var(--nabd-color-text-secondary)' }}>
          {meta}
        </span>
      ) : null}
      {endIcon ? <Icon name={endIcon} size={20} tone="secondary" /> : null}
      {endContent === 'chevron' ? (
        <Icon name="caret-left" size={16} tone="secondary" />
      ) : endContent === 'check' ? (
        <Icon name="check" size={20} tone="primary" />
      ) : endContent === 'switch' ? (
        <span role="switch" aria-checked={selected} aria-label={onEndPressLabel ?? title} style={{ width: 44, height: 26, borderRadius: 9999, background: selected ? 'var(--nabd-color-action-primary-bg)' : 'var(--nabd-color-bg-sunken)' }} />
      ) : null}
    </div>
  );
}

/**
 * The home-screen service tile (canvas/HomeApp.dc.html): a 108px surface card,
 * radius 22, with the service's <FIcon> (soft chip, from the handoff service map)
 * over a 13/600 label. The label is what names the tile; the icon is aria-hidden,
 * so the tile is read once, as its name.
 */
const TILE_CHIP = { sm: 44, md: 50, lg: 56 } as const;

export function ServiceTile({
  name,
  label,
  size = 'md',
  badge,
  disabled = false,
  testID,
}: ServiceTileProps) {
  const { icon, tone } = SERVICE_ICONS[name];
  return (
    <div
      data-testid={testID}
      data-service={name}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minBlockSize: 108,
        paddingInline: 'var(--nabd-space-2xs)',
        borderRadius: 22,
        background: 'var(--nabd-color-bg-surface)',
        border: '1px solid var(--nabd-color-border-hairline)',
        boxShadow: 'var(--nabd-shadow-card)',
        color: 'var(--nabd-color-text-primary)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <FIcon icon={icon} tone={tone} size={TILE_CHIP[size]} />
      <span style={{ fontSize: 'var(--nabd-font-size-caption)', fontWeight: 600, textAlign: 'center', overflowWrap: 'anywhere' }}>{label}</span>
      {badge ? (
        <span style={{ position: 'absolute', insetBlockStart: 8, insetInlineEnd: 8 }}>
          <Badge content={badge} />
        </span>
      ) : null}
    </div>
  );
}

/**
 * A section title with an optional trailing action (canvas/HomeApp.dc.html:
 * 18/700 heading, 13/500 link in text.link). The action is rendered by the screen
 * as a link or button through `action`; `actionLabel` alone renders its text.
 */
export function SectionHeader({ title, actionLabel, level = 2, testID, action }: SectionHeaderProps & { action?: React.ReactNode }) {
  const H = level === 3 ? 'h3' : 'h2';
  return (
    <div data-testid={testID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--nabd-space-xs)' }}>
      <H style={{ margin: 0, fontSize: 'var(--nabd-font-size-h4)', fontWeight: 700, color: 'var(--nabd-color-text-primary)' }}>{title}</H>
      {action ?? (actionLabel ? <span style={{ fontSize: 'var(--nabd-font-size-caption)', fontWeight: 500, color: 'var(--nabd-color-text-link)' }}>{actionLabel}</span> : null)}
    </div>
  );
}
SectionHeader.displayName = 'SectionHeader';

export function Avatar({ name, size = 'md', src, status = 'none', testID }: AvatarProps) {
  const box = size === 'sm' ? 32 : size === 'md' ? 44 : 64;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('');
  // canvas/HomeApp.dc.html: tinted disc, 2px surface gap, 2px coral ring
  const ring: React.CSSProperties = {
    boxSizing: 'border-box',
    width: box,
    height: box,
    borderRadius: 'var(--nabd-radius-pill)',
    background: 'var(--nabd-color-avatar-bg)',
    border: '2px solid var(--nabd-color-bg-surface)',
    boxShadow: '0 0 0 2px var(--nabd-color-avatar-ring)',
  };

  return (
    <span
      data-testid={testID}
      role="img"
      aria-label={name}
      style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', width: box, height: box }}
    >
      {src ? (
        // a real photo; the name is already the accessible name of the wrapper
        <img src={src} alt="" aria-hidden width={box} height={box} style={{ ...ring, objectFit: 'cover' }} />
      ) : (
        <span
          aria-hidden
          style={{ ...ring, display: 'grid', placeItems: 'center', fontSize: Math.round(box * 0.36), fontWeight: 700, color: 'var(--nabd-color-text-primary)' }}
        >
          {initials || <Icon name="user" size={Math.round(box * 0.5)} tone="secondary" />}
        </span>
      )}
      {status !== 'none' ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 0,
            insetInlineEnd: 0,
            width: 12,
            height: 12,
            borderRadius: 'var(--nabd-radius-pill)',
            border: '2px solid var(--nabd-color-bg-surface)',
            background:
              status === 'online'
                ? 'var(--nabd-color-status-success-fg)'
                : status === 'alert'
                  ? 'var(--nabd-color-status-danger-fg)'
                  : 'var(--nabd-color-text-tertiary)',
          }}
        />
      ) : null}
    </span>
  );
}

export function PriceTag({ amount, currency, was, note, testID }: PriceTagProps) {
  return (
    <span data-testid={testID} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'var(--nabd-space-3xs)' }}>
      {was ? (
        <s style={{ fontSize: 'var(--nabd-font-size-body)', color: 'var(--nabd-color-text-tertiary)' }}>{was}</s>
      ) : null}
      <span style={{ fontSize: 'var(--nabd-font-size-h4)', fontWeight: 700, color: 'var(--nabd-color-text-primary)' }}>
        {amount}
      </span>
      {currency ? <span style={{ fontSize: 'var(--nabd-font-size-label)', color: 'var(--nabd-color-text-secondary)' }}>{currency}</span> : null}
      {note ? <span style={{ fontSize: 'var(--nabd-font-size-caption)', color: 'var(--nabd-color-text-secondary)' }}>{note}</span> : null}
    </span>
  );
}

/**
 * A rating with a real count beside it. There is no "sample" mode on purpose:
 * five filled stars and no number is a claim the product cannot back, so `count`
 * is what turns a row of glyphs into information. `formatLabel` is supplied by
 * the app so the sentence is localised there, not here.
 */
/**
 * DoctorCard board rating: one filled star, the value (14/700) and the count in
 * brackets (12/400). Nothing at all when there are no real ratings.
 */
export function Rating({ value, count, max = 5, size = 'sm', surface = 'default', formatLabel, testID }: RatingProps) {
  if (value == null || !(count > 0)) return null;
  const px = size === 'sm' ? 16 : 20;
  const shown = value.toFixed(1);
  const onBrand = surface === 'onBrand';
  return (
    <span
      data-testid={testID}
      role="img"
      aria-label={formatLabel ? formatLabel(value, count) : `${shown} out of ${max}, ${count} ratings`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: onBrand ? 'var(--nabd-color-action-primary-fg)' : 'var(--nabd-color-text-primary)' }}
    >
      <svg aria-hidden="true" width={px} height={px} viewBox="0 0 256 256">
        <path d={FILL_ICON_PATHS.star} fill={onBrand ? 'var(--nabd-color-icon-ratingStarOnBrand)' : 'var(--nabd-color-icon-ratingStar)'} />
      </svg>
      <span aria-hidden style={{ fontSize: size === 'sm' ? 'var(--nabd-font-size-caption)' : 'var(--nabd-font-size-body)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {shown}
      </span>
      <span aria-hidden style={{ fontSize: 'var(--nabd-font-size-label)', fontWeight: 400, opacity: 0.85 }}>({count})</span>
    </span>
  );
}

export function MapPinCard({
  title,
  address,
  distance,
  actionLabel,
  startIcon = 'pin',
  loading = false,
  disabled = false,
  testID,
}: MapPinCardProps) {
  return (
    <div
      data-testid={testID}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--nabd-space-sm)',
        padding: 'var(--nabd-space-sm)',
        borderRadius: 'var(--nabd-radius-lg)',
        background: 'var(--nabd-color-bg-surface)',
        boxShadow: 'var(--nabd-shadow-pin)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon name={startIcon} size={24} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--nabd-font-size-bodyStrong)', color: 'var(--nabd-color-text-primary)' }}>{title}</div>
        {address ? (
          <div style={{ fontSize: 'var(--nabd-font-size-caption)', color: 'var(--nabd-color-text-secondary)' }}>{address}</div>
        ) : null}
      </div>
      {distance ? (
        <span style={{ fontSize: 'var(--nabd-font-size-label)', fontVariantNumeric: 'tabular-nums', color: 'var(--nabd-color-text-secondary)' }}>
          {distance}
        </span>
      ) : null}
      {actionLabel ? (
        <button
          type="button"
          aria-label={actionLabel}
          style={{ minWidth: 44, minHeight: 44, display: 'grid', placeItems: 'center', background: 'transparent', border: 0, cursor: 'pointer' }}
        >
          <Icon name="caret-left" size={18} />
        </button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- navigation */

function TabButton({
  item,
  active,
  onSelect,
  layout,
}: {
  item: TabItem;
  active: boolean;
  onSelect?: (id: string) => void;
  layout: 'line' | 'segmented' | 'bar';
}) {
  const ink = active ? 'var(--nabd-color-action-primary-fg)' : 'var(--nabd-color-text-secondary)';
  const bg =
    layout === 'segmented'
      ? active
        ? 'var(--nabd-color-action-secondary-bg)'
        : 'transparent'
      : layout === 'bar'
        ? active
          ? 'var(--nabd-color-action-primary-bg)'
          : 'transparent'
        : 'transparent';

  return (
    <button
      type="button"
      role="tab"
      id={`tab-${item.id}`}
      aria-selected={active}
      aria-controls={`panel-${item.id}`}
      tabIndex={active ? 0 : -1}
      disabled={item.disabled}
      onClick={() => onSelect?.(item.id)}
      style={{
        ...NO_UNDERLINE,
        position: 'relative',
        display: 'grid',
        justifyItems: 'center',
        gap: 2,
        minHeight: 'var(--nabd-a11y-minTouchTarget)',
        paddingInline: 'var(--nabd-space-sm)',
        paddingBlock: 'var(--nabd-space-2xs)',
        background: bg,
        color: ink,
        border: 0,
        borderRadius: 'var(--nabd-radius-md)',
        cursor: item.disabled ? 'not-allowed' : 'pointer',
        opacity: item.disabled ? 0.5 : 1,
        fontSize: 'var(--nabd-font-size-micro)',
        fontWeight: active ? 700 : 500,
        // A 3px underline is the canvas's active affordance for a line tab.
        boxShadow: layout === 'line' && active ? 'inset 0 -3px 0 var(--nabd-color-action-primary-bg)' : 'none',
      }}
    >
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
        <Icon name={item.icon} size={22} />
        {item.badge !== undefined ? (
          <span style={{ position: 'absolute', top: -6, insetInlineEnd: -10 }}>
            <Badge content={item.badge} />
          </span>
        ) : null}
      </span>
      {item.label}
    </button>
  );
}

export function Tabs({ items, value, onChange, variant = 'line', fullWidth = false, testID }: TabsProps) {
  return (
    <div
      role="tablist"
      data-testid={testID}
      aria-orientation="horizontal"
      style={{
        display: 'flex',
        gap: variant === 'segmented' ? 'var(--nabd-space-3xs)' : 0,
        padding: variant === 'segmented' ? 'var(--nabd-space-3xs)' : 0,
        background: variant === 'segmented' ? 'var(--nabd-color-bg-sunken)' : 'transparent',
        borderRadius: variant === 'segmented' ? 'var(--nabd-radius-pill)' : 0,
        width: fullWidth ? '100%' : undefined,
      }}
    >
      {items.map((item) => (
        <TabButton
          key={item.id}
          item={item}
          active={item.id === value}
          onSelect={onChange}
          layout={variant}
        />
      ))}
    </div>
  );
}

export function NavBar({ title, showBack = false, backLabel = 'Back', actions = [], testID }: NavBarProps) {
  return (
    <header
      data-testid={testID}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--nabd-z-appBar)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--nabd-space-2xs)',
        minHeight: 'var(--nabd-a11y-minTouchTarget)',
        paddingInline: 'var(--nabd-space-sm)',
        background: 'var(--nabd-color-bg-surface)',
        borderBottom: '1px solid var(--nabd-color-border-default)',
      }}
    >
      {showBack ? (
        <button
          type="button"
          aria-label={backLabel}
          style={{ minWidth: 44, minHeight: 44, display: 'grid', placeItems: 'center', background: 'transparent', border: 0, cursor: 'pointer' }}
        >
          {/* The chevron points the way the reader travels, which in RTL is the
              opposite of the LTR glyph — hence the two variants. */}
          <Icon name="caret-right" size={20} />
        </button>
      ) : null}
      <h1 style={{ flex: 1, margin: 0, fontSize: 'var(--nabd-font-size-h4)', color: 'var(--nabd-color-text-primary)' }}>
        {title}
      </h1>
      {actions.map((a) => (
        <button
          key={a.name}
          type="button"
          aria-label={a.label}
          disabled={a.disabled}
          style={{ minWidth: 44, minHeight: 44, display: 'grid', placeItems: 'center', background: 'transparent', border: 0, cursor: 'pointer' }}
        >
          <Icon name={a.name} size={20} />
        </button>
      ))}
    </header>
  );
}

const TAB_BAR_H = 68;
const TAB_ITEM = 52;
const TAB_FAB = 66;

/**
 * canvas/HomeApp.dc.html nav: the floating glass pill, the active item an ink pill
 * with icon and label, the raised coral centre. Geometry and colours as the
 * native shell TabBar (packages/ui-native/src/shells/TabBar.tsx).
 */
export function BottomTabBar({ items, value, onChange, label = 'Main navigation', safeAreaInset = false, testID }: BottomTabBarProps) {
  return (
    <nav
      aria-label={label}
      data-testid={testID}
      style={{
        height: TAB_BAR_H,
        boxSizing: 'border-box',
        borderRadius: TAB_BAR_H / 2,
        background: 'var(--nabd-color-glass-bgStrong)',
        WebkitBackdropFilter: 'blur(var(--nabd-color-glass-blur))',
        backdropFilter: 'blur(var(--nabd-color-glass-blur))',
        border: '1px solid var(--nabd-color-border-onGlass)',
        boxShadow: 'var(--nabd-shadow-tabBar)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingInline: 8,
        marginBlockEnd: safeAreaInset ? 'env(safe-area-inset-bottom)' : undefined,
      }}
    >
      {items.map((item) => {
        const active = item.id === value;
        const common = {
          type: 'button' as const,
          'aria-label': item.label,
          'aria-current': active ? ('page' as const) : undefined,
          disabled: item.disabled,
          onClick: () => onChange?.(item.id),
        };
        if (item.raised) {
          return (
            <button
              key={item.id}
              {...common}
              style={{ width: TAB_ITEM, height: TAB_ITEM, padding: 0, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <span
                style={{
                  width: TAB_FAB,
                  height: TAB_FAB,
                  flexShrink: 0,
                  marginTop: -34,
                  boxSizing: 'border-box',
                  borderRadius: TAB_FAB / 2,
                  background: 'linear-gradient(180deg, var(--nabd-color-action-fab-from) 0%, var(--nabd-color-action-fab-to) 100%)',
                  border: '5px solid var(--nabd-color-bg-canvas)',
                  boxShadow: 'var(--nabd-shadow-fab)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width={28} height={28} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true">
                  <path d={FILL_ICON_PATHS[item.icon]} fill="var(--nabd-color-action-fab-fg)" />
                </svg>
              </span>
            </button>
          );
        }
        return (
          <button
            key={item.id}
            {...common}
            style={{
              height: TAB_ITEM,
              minWidth: TAB_ITEM,
              boxSizing: 'border-box',
              paddingInline: active ? 18 : 0,
              borderRadius: TAB_ITEM / 2,
              border: 0,
              background: active ? 'var(--nabd-color-action-selected-bg)' : 'transparent',
              color: active ? 'var(--nabd-color-action-selected-fg)' : 'var(--nabd-color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'inherit',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <svg width={24} height={24} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true">
              <path d={FILL_ICON_PATHS[item.icon]} fill="currentColor" />
            </svg>
            {active ? <span aria-hidden>{item.label}</span> : null}
            {item.badge !== undefined ? (
              <span style={{ position: 'absolute', top: 4, insetInlineEnd: 4 }} aria-hidden>
                <Badge content={item.badge} />
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  title,
  items,
  value,
  onChange,
  collapsible = false,
  collapsed = false,
  testID,
}: SidebarProps) {
  return (
    <nav
      aria-label={title}
      data-testid={testID}
      style={{
        display: 'grid',
        gap: 'var(--nabd-space-3xs)',
        alignContent: 'start',
        width: collapsed ? 'var(--nabd-space-4xl)' : 'var(--nabd-space-5xl)',
        padding: 'var(--nabd-space-sm)',
        background: 'var(--nabd-color-bg-surface)',
        borderInlineEnd: '1px solid var(--nabd-color-border-default)',
      }}
    >
      <div style={{ fontSize: 'var(--nabd-font-size-label)', fontWeight: 700, color: 'var(--nabd-color-text-tertiary)' }}>
        {collapsed ? '' : title}
      </div>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            aria-label={collapsed ? item.label : undefined}
            disabled={item.disabled}
            onClick={() => onChange?.(item.id)}
            style={{
              ...NO_UNDERLINE,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--nabd-space-2xs)',
              minHeight: 'var(--nabd-a11y-minTouchTarget)',
              paddingInline: 'var(--nabd-space-2xs)',
              borderRadius: 'var(--nabd-radius-md)',
              border: 0,
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: active ? 'var(--nabd-color-action-selected-bg)' : 'transparent',
              color: active ? 'var(--nabd-color-action-selected-fg)' : 'var(--nabd-color-text-secondary)',
              fontSize: 'var(--nabd-font-size-body)',
              fontWeight: active ? 700 : 500,
            }}
          >
            <Icon name={item.icon} size={20} />
            {collapsed ? null : item.label}
            {item.badge !== undefined && !collapsed ? <Badge content={item.badge} tone="neutral" /> : null}
          </button>
        );
      })}
      {collapsible ? null : null}
    </nav>
  );
}

Card.displayName = 'NabdCard';
ListItem.displayName = 'NabdListItem';
ServiceTile.displayName = 'NabdServiceTile';
Tabs.displayName = 'NabdTabs';
NavBar.displayName = 'NabdNavBar';
BottomTabBar.displayName = 'NabdBottomTabBar';
Sidebar.displayName = 'NabdSidebar';
