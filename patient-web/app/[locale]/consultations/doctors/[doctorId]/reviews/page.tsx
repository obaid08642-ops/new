import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { SectionCard } from "@/components-next/consult/consult-parts";
import { ReviewList } from "@/components-next/consult/doctor-sections";
import { extractPublicRatings, parseDoctorId } from "@/lib/api/doctors";
import { getPublicDoctorRatings } from "@/lib/api/doctors-server";
import { reviewItems } from "@/lib/consult/doctor-reviews";
import { formatNumber } from "@/lib/format-price";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string; doctorId: string }>; searchParams: Promise<{ page?: string }> };
const PAGE_SIZE = 20;

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Doctors" });
  return { title: t("reviewsAllTitle"), robots: { index: false, follow: true } };
}

/** All written reviews of a doctor (GET /ratings/provider/:id): score, comment, date and the reviewer's first name. */
export default async function DoctorReviewsPage({ params, searchParams }: Props) {
  const { locale, doctorId } = await params;
  if (!isLocale(locale) || !parseDoctorId(doctorId).success) notFound();
  setRequestLocale(locale);
  const { page: rawPage } = await searchParams;
  const page = /^\d{1,3}$/.test(rawPage ?? "") && Number(rawPage) > 0 ? Number(rawPage) : 1;
  const t = await getTranslations("Doctors");
  const c = await getTranslations("ConsultWeb");
  const response = await getPublicDoctorRatings(doctorId, page).catch(() => null);
  const back = `/${locale}/consultations/doctors/${encodeURIComponent(doctorId)}`;
  if (!response || !response.ok) {
    return (
      <ConsultPage locale={locale} title={t("reviewsAllTitle")} backHref={back}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  const { items, total } = extractPublicRatings(await response.json().catch(() => null));
  const subLabels = { communication: t("subRatingCommunication"), punctuality: t("subRatingPunctuality"), cleanliness: t("subRatingCleanliness"), value: t("subRatingValue") };
  const rows = reviewItems(items, locale, { anonymous: t("reviewerAnonymous"), subLabels });
  const hasMore = total !== undefined ? page * PAGE_SIZE < total : items.length === PAGE_SIZE;
  return (
    <ConsultPage locale={locale} title={t("reviewsAllTitle")} backHref={back}>
      <SectionCard id="reviews-all-title" title={t("reviewsTitle")}>
        {rows.length ? <ReviewList items={rows} scoreLabel={(score) => c("ratingOutOf", { value: formatNumber(locale, score) })} /> : <p>{t("reviewsEmpty")}</p>}
      </SectionCard>
      {hasMore ? <ButtonLink href={`${back}/reviews?page=${page + 1}`} label={t("reviewsMore")} variant="outline" fullWidth /> : null}
      <ButtonLink href={back} label={t("reviewsBack")} variant="ghost" fullWidth />
    </ConsultPage>
  );
}
