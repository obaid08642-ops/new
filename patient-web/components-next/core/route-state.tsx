"use client";

import { FILL_MAP_TRIFOLD, FILL_WARNING } from "@/components-next/ui-generated/icons/fill-glyphs";

type Props = {
  kind: "error" | "not-found";
  locale: string;
  title: string;
  body: string;
  primaryLabel: string;
  returnHomeLabel: string;
  onRetry?: () => void;
};

/**
 * The route-level error and not-found screens: the board's state card (canvas/States), drawn with the same
 * classes as `ErrorState` / `EmptyState` / `FIcon` / `Button` of the design system (components.css).
 *
 * It does NOT import those components. This module is in every route's bundle (the locale error boundary), and
 * the components pull the icon sets, the illustration loader and the other component files with them: about
 * 17 KB gz of shared JS on routes that never draw a card (issue #286). The markup is small and
 * `tests/route-state.test.tsx` pins it to the design system's classes. Colours and geometry come from the CSS, so
 * there is no style attribute (CSP) and no raw colour.
 */

/** FIcon, chip "soft", 112: glyph 52% of the box, tile radius 32% (packages/ui/components/FIcon.tsx). */
function StateGlyph({ icon, path }: { icon: string; path: string }) {
  return (
    <span data-icon={icon} data-tone="amber" aria-hidden="true" className="nabd-ficon nabd-ficon--soft nabd-tone--amber">
      <svg className="nabd-ficon__glyphbox" width={58} height={58} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
        <path className="nabd-ficon__glyph" d={path} />
      </svg>
      <svg className="nabd-ficon__chipbox" width={112} height={112} viewBox="0 0 112 112" aria-hidden="true" focusable="false">
        <rect className="nabd-ficon__chip" width={112} height={112} rx={36} />
      </svg>
    </span>
  );
}

export function RouteState({ kind, locale, title, body, primaryLabel, returnHomeLabel, onRetry }: Props) {
  // The way home is a real link: it works before hydration and without JS, and a full navigation also
  // clears a crashed route's error boundary.
  const home = `/${locale}`;
  const failed = kind === "error";
  return (
    <main className="main auth-wrap">
      <div className="nabd-route-state">
        <div data-kind={failed ? "error" : "empty"} role={failed ? "alert" : undefined} className="nabd-state">
          <StateGlyph icon={failed ? "warning" : "map-trifold"} path={failed ? FILL_WARNING : FILL_MAP_TRIFOLD} />
          <h2 className="nabd-state__title">{title}</h2>
          <p className="nabd-state__body">{body}</p>
          {failed ? (
            <div className="nabd-state__actions">
              <button type="button" className="nabd-button nabd-button--primary nabd-button--lg nabd-button--full" data-variant="primary" data-size="lg" onClick={onRetry}>
                <span className="nabd-button__label">{primaryLabel}</span>
              </button>
            </div>
          ) : null}
        </div>
        {failed ? (
          <a className="nabd-state__text-action" href={home}>{returnHomeLabel}</a>
        ) : (
          <a className="nabd-button nabd-button--primary nabd-button--lg nabd-button--full" href={home}>
            <span className="nabd-button__label">{primaryLabel}</span>
          </a>
        )}
      </div>
    </main>
  );
}
