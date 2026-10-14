import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { AppearanceLanguage } from "@/components-next/settings/appearance-language";

type Props = { params: Promise<{ locale: string }> };

/** `/settings/language` (merge map section 3): the language and the appearance (canvas/Settings), kept on this device. */
export default async function SettingsLanguagePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("SettingsWeb");
  return (
    <ConsultPage locale={locale} title={t("langTitle")} backHref={`/${locale}/settings`}>
      <AppearanceLanguage locale={locale} />
    </ConsultPage>
  );
}
