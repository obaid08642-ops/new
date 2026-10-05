import * as React from 'react';
import clsx from 'clsx';

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
 *
 * Every surface is styled by class (css/Surfaces.css), never by the `style` prop;
 * components.css says why. A tone resolves to two colours, the ink and the
 * surface it sits on; that table is with the Badge in css/Surfaces.css.
 */

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
      // 38 visual, 44 hit: the extra 3px each side is given back to the layout (css/Surfaces.css)
      className={clsx('nabd-chip', { 'nabd-chip--inert': inert, 'nabd-chip--disabled': disabled })}
    >
      <span className={clsx('nabd-chip__pill', { 'nabd-chip__pill--selected': selected })}>
        {startIcon ? <Icon name={startIcon} size={16} tone="currentColor" /> : null}
        {label}
        {count !== undefined ? <span className="nabd-chip__count">{count}</span> : null}
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
    <span data-testid={testID} aria-hidden className={`nabd-badge nabd-badge--${tone}`}>
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
  // padding: canvas/OrderTracking (16), Cart (14), CareHub (18), in css/Surfaces.css.
  // A tint is the hero wash in its service tone and has no card shadow.
  return (
    <section
      data-testid={testID}
      data-tint={tint}
      className={clsx(
        'nabd-card',
        `nabd-card--elevation-${elevation}`,
        `nabd-card--pad-${padding}`,
        tint ? ['nabd-card--tinted', `nabd-tone--${tint}`] : null,
      )}
    >
      {title || subtitle ? (
        <div className="nabd-card__head">
          {title ? <h3 className="nabd-card__title">{title}</h3> : null}
          {subtitle ? <p className="nabd-card__subtitle">{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
      {footer ? <div className="nabd-card__footer">{footer}</div> : null}
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
      className={clsx('nabd-list-item', { 'nabd-list-item--selected': selected, 'nabd-list-item--disabled': disabled })}
    >
      {leading ? <FIcon icon={leading.icon} tone={leading.tone} size={40} /> : startIcon ? <Icon name={startIcon} size={20} tone="secondary" /> : null}
      <div className="nabd-list-item__body">
        <div className="nabd-list-item__title">{title}</div>
        {subtitle ? <div className="nabd-list-item__subtitle">{subtitle}</div> : null}
      </div>
      {meta ? <span className="nabd-list-item__meta">{meta}</span> : null}
      {endIcon ? <Icon name={endIcon} size={20} tone="secondary" /> : null}
      {endContent === 'chevron' ? (
        <Icon name="caret-left" size={16} tone="secondary" />
      ) : endContent === 'check' ? (
        <Icon name="check" size={20} tone="primary" />
      ) : endContent === 'switch' ? (
        <span
          role="switch"
          aria-checked={selected}
          aria-label={onEndPressLabel ?? title}
          className={clsx('nabd-list-item__switch', { 'nabd-list-item__switch--on': selected })}
        />
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
      className={clsx('nabd-service-tile', { 'nabd-service-tile--disabled': disabled })}
    >
      <FIcon icon={icon} tone={tone} size={TILE_CHIP[size]} />
      <span className="nabd-service-tile__label">{label}</span>
      {badge ? (
        <span className="nabd-service-tile__badge">
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
    <div data-testid={testID} className="nabd-section-header">
      <H className="nabd-section-header__title">{title}</H>
      {action ?? (actionLabel ? <span className="nabd-section-header__action">{actionLabel}</span> : null)}
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
  // canvas/HomeApp.dc.html: tinted disc, 2px surface gap, 2px coral ring (the
  // `nabd-avatar__ring` class); the box and the initials per size are css/Surfaces.css.

  return (
    <span data-testid={testID} role="img" aria-label={name} className={`nabd-avatar nabd-avatar--${size}`}>
      {src ? (
        // a real photo; the name is already the accessible name of the wrapper
        <img src={src} alt="" aria-hidden width={box} height={box} className="nabd-avatar__ring nabd-avatar__photo" />
      ) : (
        <span aria-hidden className="nabd-avatar__ring nabd-avatar__initials">
          {initials || <Icon name="user" size={Math.round(box * 0.5)} tone="secondary" />}
        </span>
      )}
      {status !== 'none' ? <span aria-hidden className={`nabd-avatar__status nabd-avatar__status--${status}`} /> : null}
    </span>
  );
}

export function PriceTag({ amount, currency, was, note, testID }: PriceTagProps) {
  return (
    <span data-testid={testID} className="nabd-price-tag">
      {was ? <s className="nabd-price-tag__was">{was}</s> : null}
      <span className="nabd-price-tag__amount">{amount}</span>
      {currency ? <span className="nabd-price-tag__currency">{currency}</span> : null}
      {note ? <span className="nabd-price-tag__note">{note}</span> : null}
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
      className={clsx('nabd-rating', `nabd-rating--${size}`, { 'nabd-rating--on-brand': onBrand })}
    >
      <svg aria-hidden="true" width={px} height={px} viewBox="0 0 256 256">
        <path d={FILL_ICON_PATHS.star} fill={onBrand ? 'var(--nabd-color-icon-ratingStarOnBrand)' : 'var(--nabd-color-icon-ratingStar)'} />
      </svg>
      <span aria-hidden className="nabd-rating__value">
        {shown}
      </span>
      <span aria-hidden className="nabd-rating__count">({count})</span>
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
    <div data-testid={testID} className={clsx('nabd-map-pin-card', { 'nabd-map-pin-card--disabled': disabled })}>
      <Icon name={startIcon} size={24} />
      <div className="nabd-map-pin-card__body">
        <div className="nabd-map-pin-card__title">{title}</div>
        {address ? <div className="nabd-map-pin-card__address">{address}</div> : null}
      </div>
      {distance ? <span className="nabd-map-pin-card__distance">{distance}</span> : null}
      {actionLabel ? (
        <button type="button" aria-label={actionLabel} className="nabd-map-pin-card__action">
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
  // The ink, the active fill per layout and the line tab's underline are
  // css/Surfaces.css (`nabd-tabs__tab--<layout>` with `--active`).
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
      className={clsx('nabd-tabs__tab', `nabd-tabs__tab--${layout}`, {
        'nabd-tabs__tab--active': active,
        'nabd-tabs__tab--disabled': item.disabled,
      })}
    >
      <span className="nabd-tabs__icon">
        <Icon name={item.icon} size={22} />
        {item.badge !== undefined ? (
          <span className="nabd-tabs__badge">
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
      className={clsx('nabd-tabs', `nabd-tabs--${variant}`, { 'nabd-tabs--full': fullWidth })}
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
    <header data-testid={testID} className="nabd-nav-bar">
      {showBack ? (
        <button type="button" aria-label={backLabel} className="nabd-nav-bar__action">
          {/* The chevron points the way the reader travels, which in RTL is the
              opposite of the LTR glyph — hence the two variants. */}
          <Icon name="caret-right" size={20} />
        </button>
      ) : null}
      <h1 className="nabd-nav-bar__title">{title}</h1>
      {actions.map((a) => (
        <button key={a.name} type="button" aria-label={a.label} disabled={a.disabled} className="nabd-nav-bar__action">
          <Icon name={a.name} size={20} />
        </button>
      ))}
    </header>
  );
}

/**
 * canvas/HomeApp.dc.html nav: the floating glass pill, the active item an ink pill
 * with icon and label, the raised coral centre. Geometry and colours as the
 * native shell TabBar (packages/ui-native/src/shells/TabBar.tsx): bar 68, item 52,
 * raised centre 66, in css/Surfaces.css.
 */
export function BottomTabBar({ items, value, onChange, label = 'Main navigation', safeAreaInset = false, testID }: BottomTabBarProps) {
  return (
    <nav
      aria-label={label}
      data-testid={testID}
      className={clsx('nabd-bottom-tab-bar', { 'nabd-bottom-tab-bar--safe-area': safeAreaInset })}
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
            <button key={item.id} {...common} className="nabd-bottom-tab-bar__raised">
              <span className="nabd-bottom-tab-bar__fab">
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
            className={clsx('nabd-bottom-tab-bar__item', { 'nabd-bottom-tab-bar__item--active': active })}
          >
            <svg width={24} height={24} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true">
              <path d={FILL_ICON_PATHS[item.icon]} fill="currentColor" />
            </svg>
            {active ? <span aria-hidden>{item.label}</span> : null}
            {item.badge !== undefined ? (
              <span className="nabd-bottom-tab-bar__badge" aria-hidden>
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
    <nav aria-label={title} data-testid={testID} className={clsx('nabd-sidebar', { 'nabd-sidebar--collapsed': collapsed })}>
      <div className="nabd-sidebar__title">
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
            className={clsx('nabd-sidebar__item', {
              'nabd-sidebar__item--active': active,
              'nabd-sidebar__item--disabled': item.disabled,
            })}
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
