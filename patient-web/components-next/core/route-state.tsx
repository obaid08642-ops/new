"use client";

import { EmptyState, ErrorState, SERVICE_ICONS } from "@/components-next/ui-generated";

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
 * The route-level error and not-found screens, built from the boards' state components (canvas/States) so
 * they carry only token colours. `main` is the same shell the auth screens use; no inline styles (CSP).
 */
export function RouteState({ kind, locale, title, body, primaryLabel, returnHomeLabel, onRetry }: Props) {
  // The way home is a real link: it works before hydration and without JS, and a full navigation also
  // clears a crashed route's error boundary.
  const home = `/${locale}`;
  return (
    <main className="main auth-wrap">
      <div className="nabd-route-state">
        {kind === "error" ? (
          <>
            <ErrorState title={title} body={body} retryLabel={primaryLabel} onRetry={onRetry} />
            <a className="nabd-state__text-action" href={home}>{returnHomeLabel}</a>
          </>
        ) : (
          <>
            <EmptyState icon="map-trifold" tone={SERVICE_ICONS.map.tone} title={title} body={body} />
            <a className="nabd-button nabd-button--primary nabd-button--lg nabd-button--full" href={home}>
              <span className="nabd-button__label">{primaryLabel}</span>
            </a>
          </>
        )}
      </div>
    </main>
  );
}
