import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLayout } from "@/components-next/auth/auth-layout";
import { OnboardingCarousel, type OnboardingSlide } from "@/components-next/onboarding-carousel";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** Intro slides, then the language step (parity with app onboarding). */
export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Onboarding" });
  const s = SERVICE_ICONS;
  const slides: OnboardingSlide[] = [
    { title: t("slide1Title"), body: t("slide1Body"), ...s.consult },
    { title: t("slide2Title"), body: t("slide2Body"), ...s.lab },
    { title: t("slide3Title"), body: t("slide3Body"), ...s.pharmacy },
  ];
  return <AuthLayout locale={locale} showMark={false}><OnboardingCarousel slides={slides} locale={locale} /></AuthLayout>;
}
