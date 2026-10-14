import * as React from 'react';

/**
 * <AppShell> — DEVICE_STANDARD §1, web. The one layout every patient-web page
 * renders inside, so no page does its own breakpoint or safe-area math.
 *
 *   < 768      top bar + bottom tab bar (`tabBar`), the page CTA (`footer`) above it
 *   768–1023   top bar + collapsible side rail (`sideNav`); the tab bar gives way
 *   >= 1024    top bar + open side nav; content max-width from the tokens
 *
 * Layout, insets and breakpoints live in ./shells.css (imported once by the app).
 * Inside `sideNav`, wrap each item's text in `<span className="nabd-shell-label">`:
 * it is hidden visually, but not from screen readers, while the rail is collapsed.
 *
 * `railToggleLabel` is the accessible name of the expand/collapse button, in the
 * page's language; the button reports its state with aria-expanded.
 */

export interface AppShellProps {
  children: React.ReactNode;
  topBar: React.ReactNode;
  /** Bottom tab bar for phones (< 768). Hidden at tablet and up when there is a side nav. */
  tabBar?: React.ReactNode;
  /**
   * The page's sticky CTA (a <StickyFooter>). It shares the sticky bottom area with
   * the tab bar, so the two never overlap and the bottom inset is added once.
   */
  footer?: React.ReactNode;
  /** Side navigation (>= 768). */
  sideNav?: React.ReactNode;
  /** Accessible name of the side navigation landmark. */
  sideNavLabel?: string;
  /** Accessible name of the bottom tab bar landmark. */
  tabBarLabel?: string;
  /** Accessible name of the rail expand/collapse button. */
  railToggleLabel?: string;
  /** Rail starts collapsed on tablets (default true). */
  defaultCollapsed?: boolean;
  /** id of <main>, for a skip link. */
  mainId?: string;
  className?: string;
}

const CHEVRON = 'M9 6l6 6-6 6';

export function AppShell({
  children,
  topBar,
  tabBar,
  footer,
  sideNav,
  sideNavLabel = 'Main navigation',
  tabBarLabel = 'Main navigation',
  railToggleLabel = 'Expand navigation',
  defaultCollapsed = true,
  mainId = 'main',
  className,
}: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const sideId = React.useId();
  const hasSide = Boolean(sideNav);

  return (
    <div
      className={['nabd-shell', className].filter(Boolean).join(' ')}
      data-has-side={hasSide ? 'true' : 'false'}
      data-has-tabs={tabBar ? 'true' : 'false'}
      data-side-collapsed={hasSide && collapsed ? 'true' : 'false'}
    >
      <header className="nabd-shell__top">{topBar}</header>
      {hasSide ? (
        <nav id={sideId} className="nabd-shell__side" aria-label={sideNavLabel}>
          <button
            type="button"
            className="nabd-shell__rail-toggle"
            aria-label={railToggleLabel}
            aria-expanded={!collapsed}
            aria-controls={sideId}
            onClick={() => setCollapsed((c) => !c)}
          >
            {/* points the way the rail will move; shells.css mirrors it for RTL and for the open state */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={CHEVRON} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {sideNav}
        </nav>
      ) : null}
      <main id={mainId} className="nabd-shell__main">
        <div className="nabd-shell__content">{children}</div>
      </main>
      {footer || tabBar ? (
        <div className="nabd-shell__bottom">
          {footer}
          {tabBar ? (
            <nav className="nabd-shell__tabs" aria-label={tabBarLabel}>
              {tabBar}
            </nav>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
AppShell.displayName = 'AppShell';
