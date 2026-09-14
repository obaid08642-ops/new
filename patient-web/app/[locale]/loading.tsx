"use client";

import { useTranslations } from "next-intl";

export default function LocaleLoading() {
  const t = useTranslations("RouteState");
  return <main className="main auth-wrap" aria-busy="true"><section className="auth-card" role="status" aria-live="polite"><div className="eyebrow">{t("loadingCode")}</div><p className="loading-title">{t("loadingTitle")}</p><p>{t("loadingBody")}</p><div className="skeleton" aria-hidden="true"><i /><i /><i /></div></section></main>;
}
