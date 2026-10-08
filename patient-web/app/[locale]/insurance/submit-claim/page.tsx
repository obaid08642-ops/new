import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { Notice } from "@/components-next/consult/consult-parts";
import { SubmitClaimForm } from "@/components-next/insurance/submit-claim-form";

type Props = { params: Promise<{ locale: string }> };

/** Submit a claim for a paid booking (POST /api/insurance/claims). */
export default async function InsuranceSubmitClaimPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("InsuranceWeb");
  await requirePatientAccess(locale);

  return (
    <ConsultPage locale={locale} title={t("claim.title")} backHref={`/${locale}/insurance?tab=claims`}>
      <Notice>{t("claim.lead")}</Notice>
      <SubmitClaimForm />
    </ConsultPage>
  );
}
