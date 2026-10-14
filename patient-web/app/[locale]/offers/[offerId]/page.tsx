import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { getOffer, getOfferProviders } from "@/lib/api/offers-server";
import { formatDate } from "@/lib/format-date";
import { getDirection, isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice, RowCard } from "@/components-next/consult/consult-parts";
import { ShareButton } from "@/components-next/share-button";
import { RecordRow } from "@/components-next/care/care-kit";
import { RowsCard, SectionHead } from "@/components-next/health/health-kit";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/loyalty/loyalty.module.css";

type Props = { params: Promise<{ locale: string; offerId: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function text(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

/**
 * One offer (merge map 2, section 7): GET /offers/:id (title, provider, prices, validity, inclusions and terms) and
 * GET /promotions/offers/:id/providers (who the offer can be booked with). The saving is the difference of the two prices the
 * server sent; nothing else is computed.
 */
export default async function OfferDetailPage({ params }: Props) {
  const { locale, offerId } = await params;
  if (!isLocale(locale) || !idPattern.test(offerId)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("OffersWeb");
  const rs = await getTranslations("RouteState");
  const frame = (body: ReactNode, title = t("detailTitle")) => (
    <ConsultPage locale={locale} title={title} backHref={`/${locale}/offers`}>
      {body}
    </ConsultPage>
  );

  let offerRes: Response, providersRes: Response;
  try {
    [offerRes, providersRes] = await Promise.all([getOffer(token, offerId), getOfferProviders(token, offerId)]);
  } catch {
    return frame(<ConsultState kind="error" title={t("errorTitle")} body={t("error")} retryLabel={rs("retry")} />);
  }
  if (offerRes.status === 401) redirect(`/${locale}/login`);
  if (offerRes.status === 404) notFound();
  if (!offerRes.ok) return frame(<ConsultState kind="error" title={t("errorTitle")} body={t("error")} retryLabel={rs("retry")} />);
  const raw = asRecord(await offerRes.json().catch(() => null));
  const offer = asRecord(raw?.data) ?? raw;
  if (!offer) notFound();

  const title = (locale === "ar" ? text(offer, ["title_ar", "title_en", "title"]) : text(offer, ["title_en", "title_ar", "title"])) ?? "";
  const provider = asRecord(offer.provider);
  const providerName = provider ? text(provider, ["name", "name_ar"]) ?? "" : "";
  const target = asRecord(offer.target);
  const strings = (v: unknown) => (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === "string");
  const inclusions = strings(target?.inclusions);
  const terms = strings(target?.terms);
  const original = typeof offer.original_price === "number" ? offer.original_price : undefined;
  const discounted = typeof offer.discounted_price === "number" ? offer.discounted_price : undefined;
  const saving = original !== undefined && discounted !== undefined && original > discounted ? original - discounted : 0;
  const longDate = (value?: string) => formatDate(locale, value ?? null, { dateStyle: "long" });
  const endDate = longDate(text(offer, ["end_date"]));
  const startDate = longDate(text(offer, ["start_date"]));
  const amount = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
  const providersPayload = providersRes.ok ? await providersRes.json().catch(() => null) : null;
  const root = asRecord(providersPayload);
  const plist = Array.isArray(providersPayload) ? providersPayload : [root?.data, root?.providers, root?.provider_profiles].find(Array.isArray);
  const providers = (Array.isArray(plist) ? plist : []).flatMap((p) => {
    const o = asRecord(p);
    if (!o || typeof o.id !== "string") return [];
    return [{
      id: o.id,
      name: text(o, ["name", "name_ar"]) ?? "",
      line: [text(o, ["specialty", "specialty_ar"]), text(o, ["city", "city_ar"])].filter(Boolean).join(" — "),
      rating: typeof o.rating_avg === "number" && o.rating_avg > 0 ? `★ ${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(o.rating_avg)}${typeof o.rating_count === "number" ? ` (${new Intl.NumberFormat(locale).format(o.rating_count)})` : ""}` : undefined,
    }];
  });
  const caret = <Icon name={getDirection(locale) === "rtl" ? "caret-left" : "caret-right"} size={18} />;

  return frame(
    <>
      <section className={rx.card} aria-label={title}>
        {target?.sponsored === true ? <StatusChip label={t("sponsored")} tone={SERVICE_ICONS.consult.tone} /> : null}
        <h2 className={styles.price}>{title}</h2>
        {providerName ? <p className={styles.fieldHint}>{providerName}</p> : null}
        {discounted !== undefined ? (
          <span className={styles.prices}>
            <strong className={styles.price}><bdi>{t("price", { amount: amount(discounted) })}</bdi></strong>
            {original !== undefined && original !== discounted ? <s className={styles.was}><bdi>{t("price", { amount: amount(original) })}</bdi></s> : null}
            {saving > 0 ? <StatusChip label={t("save", { amount: amount(saving) })} tone={SERVICE_ICONS.lab.tone} /> : null}
          </span>
        ) : null}
        {endDate ? <p className={styles.fieldHint}>{t("validUntil", { date: endDate })}</p> : startDate ? <p className={styles.fieldHint}>{t("startsOn", { date: startDate })}</p> : null}
        <ShareButton title={title} />
      </section>
      {inclusions.length > 0 ? (
        <>
          <SectionHead id="inclusions" title={t("inclusions")} />
          <RowsCard label={t("inclusions")}>
            {inclusions.map((item, i) => <li key={`${item}-${i}`}><RecordRow icon="check-circle" tone={SERVICE_ICONS.lab.tone} title={item} /></li>)}
          </RowsCard>
        </>
      ) : null}
      {terms.length > 0 ? (
        <>
          <SectionHead id="terms" title={t("terms")} />
          <RowsCard label={t("terms")}>
            {terms.map((item, i) => <li key={`${item}-${i}`}><RecordRow icon="info" tone={SERVICE_ICONS.consult.tone} title={item} /></li>)}
          </RowsCard>
        </>
      ) : null}
      <SectionHead id="providers" title={t("bookAt")} />
      {providers.length === 0 ? (
        <Notice>{providerName ? t("bookAtProvider", { provider: providerName }) : t("noProviders")}</Notice>
      ) : (
        providers.map((p) => (
          <RowCard key={p.id} href={`/${locale}/consultations/book/${encodeURIComponent(p.id)}`} icon="hospital" tone={SERVICE_ICONS.consult.tone} title={p.name} sub={[p.line, p.rating].filter(Boolean).join(" · ") || undefined} caret={caret} />
        ))
      )}
    </>,
    title || t("detailTitle"),
  );
}
