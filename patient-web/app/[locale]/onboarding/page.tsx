import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { OnboardingCarousel } from "@/components-next/onboarding-carousel";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app onboarding: intro slides then language step. */
export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const slides = ar
    ? [
      { title: "رعايتك الصحية المتكاملة في تطبيق واحد", body: "استشارات، صيدلية، تحاليل، تمريض وأكثر." },
      { title: "احجز في دقائق", body: "مواعيد حضور وعن بعد وزيارات منزلية." },
      { title: "تابع صحتك", body: "مؤشرات حيوية وتقارير وتذكيرات أدوية." },
    ]
    : [
      { title: "Integrated care in one app", body: "Consultations, pharmacy, labs, nursing and more." },
      { title: "Book in minutes", body: "Clinic, video and home visits." },
      { title: "Track your health", body: "Vitals, reports and medication reminders." },
    ];
  return (
    <main className="main">
      <h1>{ar ? "أهلاً بك في نبض" : "Welcome to Nabd"}</h1>
      <OnboardingCarousel slides={slides} locale={locale} />
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/${locale}/onboarding/language`}>{ar ? "متابعة" : "Continue"}</Link>
        <Link href={`/${locale}/welcome`}>{ar ? "تخطي" : "Skip"}</Link>
      </nav>
    </main>
  );
}
