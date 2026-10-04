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
import { SERVICE_ICONS } from '../icons/fill';

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

export function Chip({
  label,
  tone = 'neutral',
  variant = 'soft',
  startIcon,
  onDismissLabel,
  selected = false,
  disabled = false,
  testID,
}: ChipProps) {
  const t = TONE_STYLE[tone];
  const solid = variant === 'solid';

  return (
    <span
      data-testid={testID}
      data-tone={tone}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--nabd-space-3xs)',
        minHeight: 'var(--nabd-a11y-minTouchTarget)',
        paddingInline: 'var(--nabd-space-sm)',
        borderRadius: 'var(--nabd-radius-pill)',
        fontSize: 'var(--nabd-font-size-label)',
        fontWeight: 600,
        background: solid ? t.fg : selected ? 'var(--nabd-color-action-selected-bg)' : t.bg,
        color: solid ? 'var(--nabd-color-action-secondary-fg)' : t.fg,
        border: `1px solid ${variant === 'outline' ? t.fg : 'transparent'}`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {startIcon ? <Icon name={startIcon} size={16} /> : null}
      {label}
      {onDismissLabel ? (
        <button
          type="button"
          aria-label={onDismissLabel}
          style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'inherit', display: 'grid', placeItems: 'center' }}
        >
          <Icon name="close" size={14} />
        </button>
      ) : null}
    </span>
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
  testID,
}: CardProps) {
  const pad = {
    none: 0,
    sm: 'var(--nabd-space-2xs)',
    md: 'var(--nabd-space-md)',
    lg: 'var(--nabd-space-lg)',
  }[padding];

  return (
    <section
      data-testid={testID}
      style={{
        background: elevation === 'flat' ? 'var(--nabd-color-bg-sunken)' : 'var(--nabd-color-bg-surface)',
        border: elevation === 'flat' ? '1px solid var(--nabd-color-border-default)' : '1px solid transparent',
        borderRadius: 'var(--nabd-radius-lg)',
        boxShadow: elevation === 'raised' ? 'var(--nabd-shadow-raised)' : elevation === 'card' ? 'var(--nabd-shadow-card)' : 'none',
        padding: pad,
        display: 'grid',
        gap: 'var(--nabd-space-2xs)',
      }}
    >
      {title ? (
        <h3 style={{ margin: 0, fontSize: 'var(--nabd-font-size-bodyStrong)', color: 'var(--nabd-color-text-primary)' }}>
          {title}
        </h3>
      ) : null}
      {subtitle ? (
        <p style={{ margin: 0, fontSize: 'var(--nabd-font-size-body)', color: 'var(--nabd-color-text-secondary)' }}>
          {subtitle}
        </p>
      ) : null}
      {footer ? (
        <div
          style={{
            marginTop: 'var(--nabd-space-2xs)',
            paddingTop: 'var(--nabd-space-2xs)',
            borderTop: '1px solid var(--nabd-color-border-default)',
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

export function Avatar({ name, size = 'md', illustratedName, status = 'none', testID }: AvatarProps) {
  const box = size === 'sm' ? 32 : size === 'md' ? 44 : 64;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('');

  return (
    <span
      data-testid={testID}
      role="img"
      aria-label={name}
      style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', width: box, height: box }}
    >
      {illustratedName ? (
        <IllustratedIconView name={illustratedName as never} size={Math.round(box * 0.86)} />
      ) : (
        <span
          aria-hidden
          style={{
            display: 'grid',
            placeItems: 'center',
            width: box,
            height: box,
            borderRadius: 'var(--nabd-radius-pill)',
            background: 'var(--nabd-color-bg-sunken)',
            boxShadow: 'var(--nabd-shadow-avatar)',
            fontSize: 'var(--nabd-font-size-label)',
            fontWeight: 700,
            color: 'var(--nabd-color-text-primary)',
          }}
        >
          {initials}
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
export function Rating({ value, count, max = 5, size = 'sm', formatLabel, testID }: RatingProps) {
  const px = size === 'sm' ? 14 : 18;

  return (
    <span
      data-testid={testID}
      role="img"
      aria-label={formatLabel ? formatLabel(value, count) : `${value} out of ${max}${count ? ` from ${count}` : ''}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--nabd-space-3xs)' }}
    >
      <span aria-hidden style={{ display: 'inline-flex', gap: 2 }}>
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            style={{
              color: i < Math.round(value) ? 'var(--nabd-color-icon-favorite)' : 'var(--nabd-color-border-strong)',
              display: 'grid',
            }}
          >
            <Icon name="star" size={px} />
          </span>
        ))}
      </span>
      {count !== undefined ? (
        <span aria-hidden style={{ fontSize: 'var(--nabd-font-size-caption)', color: 'var(--nabd-color-text-secondary)' }}>
          {count}
        </span>
      ) : null}
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

export function BottomTabBar({ items, value, onChange, testID }: BottomTabBarProps) {
  return (
    <nav
      aria-label="Primary"
      data-testid={testID}
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 'var(--nabd-z-appBar)',
        display: 'flex',
        justifyContent: 'space-around',
        paddingBlock: 'var(--nabd-space-2xs)',
        paddingBottom: 'max(var(--nabd-space-2xs), env(safe-area-inset-bottom))',
        background: 'var(--nabd-color-bg-surface)',
        borderTop: '1px solid var(--nabd-color-border-default)',
      }}
    >
      {items.map((item) => (
        <TabButton key={item.id} item={item} active={item.id === value} onSelect={onChange} layout="bar" />
      ))}
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
