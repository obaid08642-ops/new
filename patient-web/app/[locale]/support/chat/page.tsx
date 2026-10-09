import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { SupportChatClient } from "@/components-next/support-chat-client";

type Props = { params: Promise<{ locale: string }> };

/** `/support/chat`: the support chat flow screen (history, message box, quick replies, image attachments). */
export default async function SupportChatPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("SupportChatWeb");
  await requirePatientAccess(locale);
  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/settings/help`}>
      <SupportChatClient />
    </ConsultPage>
  );
}
