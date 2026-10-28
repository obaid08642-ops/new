import { Facts, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { money } from "@/lib/diagnostics-format";
import { pickName } from "@/lib/i18n/localized";
import type { OfferSummary, ServiceOffer } from "@/lib/api/offers";
import { ratingLine } from "./catalog-rows";
import { DIAG_TONES } from "./tones";
import { NotifyMeButton, type InterestType } from "./notify-me-button";

/**
 * What the catalogue detail says about who offers the service (the `offers` of GET /labs|radiology/services/:id, GET /home-care/services/:id):
 * the centres side by side with price, where and insurance, cheapest first (a price comparison; the order flow still checks out one item).
 * A service nobody offers yet says so and offers "Notify me when available". Draws nothing when the payload has no summary (an older answer).
 */
export function OffersSection({ locale, t, kind, serviceId, offer, offers }: { locale: string; /** the page's DiagWeb translator */ t: (key: string, values?: Record<string, string | number>) => string; kind: InterestType; serviceId: string; offer?: OfferSummary; offers?: ServiceOffer[] }) {
  if (!offer) return null;
  if (offer.providersCount === 0) {
    return (
      <SectionCard id="item-offers" title={t("offerNone")}>
        <p>{t("offerNoneBody")}</p>
        <NotifyMeButton serviceType={kind} serviceId={serviceId} locale={locale} />
      </SectionCard>
    );
  }
  const list = offers ?? [];
  if (list.length === 0) return null;
  const rows: FactRow[] = list.map((o) => {
    const where = [o.premises ? t("offerAtCentre") : "", o.home ? t("offerAtHome") : "", o.insurance ? t("offerInsurance") : ""].filter(Boolean);
    const rating = ratingLine({ locale, tr: (key, values) => t(key, values) }, o.rating, o.ratingCount);
    return {
      label: pickName(locale, o.names) ?? o.providerId,
      value: <>{o.price !== undefined ? <bdi>{money(locale, o.price)}</bdi> : t("offerNoPrice")}{[...where, ...(rating ? [rating] : [])].map((part) => <span key={part}> · {part}</span>)}</>,
      icon: "tag",
      tone: DIAG_TONES[kind === "radiology" ? "radiology" : kind === "nursing" ? "facility" : "lab"],
    };
  });
  return (
    <SectionCard id="item-offers" title={t("offersTitle")}>
      <Facts rows={rows} label={t("offersTitle")} />
    </SectionCard>
  );
}
