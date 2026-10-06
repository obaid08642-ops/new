import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
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
  const ar = locale === "ar";
  const s = SERVICE_ICONS;
  const slides: OnboardingSlide[] = ar
    ? [
      { title: "رعايتك الصحية في مكان واحد", body: "استشارات وصيدلية وتحاليل وتمريض منزلي وأكثر.", ...s.consult },
      { title: "احجز في دقائق", body: "مواعيد في العيادة أو بالفيديو أو زيارة منزلية.", ...s.lab },
      { title: "تابع صحتك", body: "مؤشراتك الحيوية وتقاريرك وتذكيرات أدويتك.", ...s.pharmacy },
    ]
    : [
      { title: "Your care, in one place", body: "Consultations, pharmacy, labs, home nursing and more.", ...s.consult },
      { title: "Book in minutes", body: "Clinic, video or home visits.", ...s.lab },
      { title: "Track your health", body: "Your vitals, reports and medication reminders.", ...s.pharmacy },
    ];
  return <AuthLayout locale={locale} showMark={false}><OnboardingCarousel slides={slides} locale={locale} /></AuthLayout>;
}
