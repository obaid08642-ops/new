import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { PostCallRatingForm } from "@/components-next/post-call-rating-form";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { Hero } from "@/components-next/consult/consult-parts";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

/** Rate a finished consultation: five stars and an optional comment, sent with the appointment it is about. */
export default async function PostCallRatingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const { appointmentId = "" } = await searchParams;
  const t = await getTranslations("PostCallRating");
  const c = await getTranslations("ConsultWeb");
  return (
    <ConsultPage locale={locale} title={t("title")} backHref={appointmentId ? `/${locale}/appointments/${encodeURIComponent(appointmentId)}` : `/${locale}/appointments`}>
      <Hero icon="star" tone="amber" title={t("title")} sub={t("subtitle")} />
      <PostCallRatingForm
        locale={locale}
        appointmentId={appointmentId}
        labels={{ rating: c("ratingGroup"), star: c("ratingStar"), comment: t("comment"), commentPh: t("commentPh"), submit: t("submit"), submitting: t("submitting"), thanks: t("thanks"), error: t("error") }}
      />
    </ConsultPage>
  );
}
