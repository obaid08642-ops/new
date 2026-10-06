import { getTranslations } from "next-intl/server";
import { CoreShell } from "@/components-next/core/core-shell";
import { LinkEmptyState } from "@/components-next/pharmacy/link-empty-state";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { RetryLinkErrorState } from "@/components-next/pharmacy-checkout/state-views";
import { requirePatientAccess } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n";
import { OrderList } from "./order-list";
import { readOrderRows } from "./read-orders";
import rx from "@/components-next/pharmacy/rx.module.css";

/** `/orders`: the patient's orders (canvas/Orders), read from the backend; the page never invents an order or a price. */
export async function OrdersScreen({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Orders" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const token = await requirePatientAccess(locale);
  const result = await readOrderRows(locale, token);

  let body;
  if (!result.ok) {
    body = <div className={rx.state}><RetryLinkErrorState title={t("listErrorTitle")} body={t("unavailableBody")} retryLabel={routeState("retry")} /></div>;
  } else if (result.rows.length === 0) {
    body = (
      <div className={rx.state} role="status">
        <LinkEmptyState icon="pill" tone={PHARMACY_TONE} title={t("emptyTitle")} body={t("emptyBody")} actionLabel={t("browse")} actionHref={`/${locale}/pharmacy`} />
      </div>
    );
  } else {
    body = <OrderList locale={locale} rows={result.rows} />;
  }

  return (
    <CoreShell locale={locale} title={t("title")} backHref={`/${locale}/profile`} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("title")}</h1></div>
        {body}
      </div>
    </CoreShell>
  );
}
