"use client";

import { lazy, Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";

// The error screen is read only when something fails, but this file is part of every page's first load: the screen (Button, FIcon and
// every icon outline) is fetched on the first error instead. React.lazy loads on first render, unlike next/dynamic, which preloads.
const RouteState = lazy(() => import("@/components-next/core/route-state").then((m) => ({ default: m.RouteState })));

export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  const t = useTranslations("RouteState");
  return (
    <Suspense fallback={null}>
      <RouteState kind="error" locale={locale} title={t("errorTitle")} body={t("errorBody")} primaryLabel={t("retry")} returnHomeLabel={t("returnHome")} onRetry={reset} />
    </Suspense>
  );
}
