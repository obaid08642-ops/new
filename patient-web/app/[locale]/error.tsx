"use client";

import { useLocale, useTranslations } from "next-intl";
import { RouteState } from "@/components-next/core/route-state";

export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  const t = useTranslations("RouteState");
  return <RouteState kind="error" locale={locale} title={t("errorTitle")} body={t("errorBody")} primaryLabel={t("retry")} returnHomeLabel={t("returnHome")} onRetry={reset} />;
}
