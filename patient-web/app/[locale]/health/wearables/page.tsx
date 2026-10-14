import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ActionLinks, Hero } from "@/components-next/consult/consult-parts";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";

type Props = { params: Promise<{ locale: string }> };

/**
 * Wearables (merge map, section 1: restyle only, on the health template). F20: the page stays hidden until the device
 * integration is real, so it answers 404 unless NEXT_PUBLIC_WEARABLES_ENABLED is on. It makes no data call; it points to the
 * mobile app for pairing and to the manual reading and the history on the vitals screen.
 */
export default async function WearablesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (process.env.NEXT_PUBLIC_WEARABLES_ENABLED !== "true") notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HealthWeb");
  await requirePatientAccess(locale);
  const health = SERVICE_ICONS.health;

  return (
    <ConsultPage locale={locale} title={t("wearablesTitle")} backHref={`/${locale}/health`}>
      <Hero icon={health.icon} tone={health.tone} title={t("wearablesTitle")} sub={t("wearablesBody")} />
      <ActionLinks actions={[
        { href: `/${locale}/health/vitals?tab=today&add=1`, label: t("wearablesLog") },
        { href: `/${locale}/health/vitals?tab=history`, label: t("vitalsHistory"), variant: "outline" },
      ]} />
    </ConsultPage>
  );
}
