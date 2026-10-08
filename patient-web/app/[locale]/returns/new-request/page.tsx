import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { SectionCard } from "@/components-next/consult/consult-parts";
import { ReturnRequestForm } from "@/components-next/return-request-form";

type Props = { params: Promise<{ locale: string }> };

/** `/returns/new-request`: the form that sends a return request (POST /api/returns). */
export default async function ReturnNewRequestPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const w = await getTranslations("ReturnsWeb");
  await requirePatientAccess(locale);
  return (
    <ConsultPage locale={locale} title={w("newRequest")} backHref={`/${locale}/returns`}>
      <SectionCard id="return-form"><ReturnRequestForm locale={locale} /></SectionCard>
    </ConsultPage>
  );
}
