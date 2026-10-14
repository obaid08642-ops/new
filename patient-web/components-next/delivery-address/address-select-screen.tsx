import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoreShell } from "@/components-next/core/core-shell";
import { LinkEmptyState } from "@/components-next/pharmacy/link-empty-state";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { RetryLinkErrorState } from "@/components-next/pharmacy-checkout/state-views";
import { getPatientAddresses } from "@/lib/api/addresses-server";
import { requirePatientAccess } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n";
import { parseDeliveryAddresses } from "@/lib/pharmacy/delivery-address";
import { AddressPicker } from "./address-picker";
import rx from "@/components-next/pharmacy/rx.module.css";

/**
 * `/delivery/address-select`: choose which saved address pharmacy orders are delivered to. The list is the patient's own
 * (GET /users/me/addresses), read through the shared address parser of the cart and checkout. A failed read is an error
 * with a retry, not an empty list.
 */
export async function AddressSelectScreen({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "DeliveryAddressSelect" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const token = await requirePatientAccess(locale);
  const response = await getPatientAddresses(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const addresses = response.ok ? parseDeliveryAddresses(await response.json().catch(() => null)) : null;

  let body;
  if (addresses === null) {
    body = <div className={rx.state}><RetryLinkErrorState title={t("errorTitle")} body={t("errorBody")} retryLabel={routeState("retry")} /></div>;
  } else if (addresses.length === 0) {
    body = (
      <div className={rx.state} role="status">
        <LinkEmptyState icon="map-pin" tone={PHARMACY_TONE} title={t("emptyTitle")} body={t("emptyBody")} actionLabel={t("emptyAction")} actionHref={`/${locale}/profile/addresses`} />
      </div>
    );
  } else {
    body = <AddressPicker locale={locale} addresses={addresses} />;
  }

  return (
    <CoreShell locale={locale} title={t("title")} backHref={`/${locale}/cart`} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("title")}</h1></div>
        {body}
      </div>
    </CoreShell>
  );
}
