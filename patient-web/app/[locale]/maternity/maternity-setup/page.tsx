import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { MaternitySetupClient } from "@/components-next/maternity-setup-client";

type Props = { params: Promise<{ locale: string }> };

/** Maternity profile setup (form): the cycle or the pregnancy path, POST /maternity/profile (through the web proxy). */
export default async function MaternitySetupPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MaternityWeb");
  await requirePatientAccess(locale);
  return (
    <ConsultPage locale={locale} title={t("setupTitle")} backHref={`/${locale}/maternity`}>
      <MaternitySetupClient locale={locale} />
    </ConsultPage>
  );
}
