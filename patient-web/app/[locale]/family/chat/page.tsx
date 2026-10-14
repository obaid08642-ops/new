import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { FamilyChat } from "@/components-next/family/family-chat";

type Props = { params: Promise<{ locale: string }> };

/** The family chat (merge map D, kept; `/health/family-chat` redirects here): the real feed polled every 5 seconds with an optimistic send. No call button. */
export default async function FamilyChatPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("FamilyWeb");
  await requirePatientAccess(locale);
  return (
    <ConsultPage locale={locale} title={t("chatTitle")} backHref={`/${locale}/family`}>
      <FamilyChat locale={locale} />
    </ConsultPage>
  );
}
