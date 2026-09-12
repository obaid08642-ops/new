"use client";

import { useTranslations } from "next-intl";

/** Route-level shimmer placeholder (P6-D wave-4). Uses the global `.skeleton` style. */
export function RouteSkeleton({ rows = 4 }: { rows?: number }) {
  const t = useTranslations("RouteState");
  return (
    <main className="main auth-wrap" aria-busy="true">
      <section className="auth-card" role="status" aria-live="polite">
        <div className="eyebrow">{t("loadingCode")}</div>
        <h1>{t("loadingTitle")}</h1>
        <p>{t("loadingBody")}</p>
        <div className="skeleton" aria-hidden="true">
          {Array.from({ length: rows }).map((_, i) => <i key={i} />)}
        </div>
      </section>
    </main>
  );
}
