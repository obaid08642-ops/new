"use client";

import { Component, lazy, Suspense, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

// The full recovery screen (icon, Button) is fetched on the first error, not with every page: this file is part of every page's first
// load, and the screen brings Button, FIcon and every icon outline. React.lazy loads on first render, unlike next/dynamic, which preloads.
const RouteState = lazy(() => import("@/components-next/core/route-state").then((m) => ({ default: m.RouteState })));

/**
 * The recovery state in plain markup (the classes of the shared state, no icon): shown at once while the full screen loads, and kept if
 * it cannot be loaded (an error while offline is exactly when a chunk cannot be fetched). It always renders, whatever the network does.
 */
function PlainState({ locale, title, body, retry, home, onRetry }: { locale: string; title: string; body: string; retry: string; home: string; onRetry: () => void }) {
  return (
    <main>
      <div data-kind="error" role="alert" className="nabd-state">
        <h2 className="nabd-state__title">{title}</h2>
        <p className="nabd-state__body">{body}</p>
        <div className="nabd-state__actions">
          <button type="button" className="nabd-button nabd-button--primary nabd-button--lg nabd-button--full" onClick={onRetry}><span className="nabd-button__label">{retry}</span></button>
          <a className="nabd-state__text-action" href={`/${locale}`}>{home}</a>
        </div>
      </div>
    </main>
  );
}

/** Keeps the plain state when the chunk of the full screen fails to load (React.lazy then throws on render). */
class ScreenGuard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  const t = useTranslations("RouteState");
  const plain = <PlainState locale={locale} title={t("errorTitle")} body={t("errorBody")} retry={t("retry")} home={t("returnHome")} onRetry={reset} />;
  return (
    <ScreenGuard fallback={plain}>
      <Suspense fallback={plain}>
        <RouteState kind="error" locale={locale} title={t("errorTitle")} body={t("errorBody")} primaryLabel={t("retry")} returnHomeLabel={t("returnHome")} onRetry={reset} />
      </Suspense>
    </ScreenGuard>
  );
}
