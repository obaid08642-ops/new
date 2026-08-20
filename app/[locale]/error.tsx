"use client";

import { useLocale, useTranslations } from "next-intl";

export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  const t = useTranslations("RouteState");

  return <main className="main auth-wrap"><section className="auth-card" role="alert" aria-live="assertive"><div className="eyebrow">{t("errorCode")}</div><h1>{t("errorTitle")}</h1><p>{t("errorBody")}</p><div className="route-state-actions"><button className="button button-primary" type="button" onClick={reset}>{t("retry")}</button><a className="button button-secondary" href={`/${locale}`}>{t("returnHome")}</a></div></section></main>;
}
