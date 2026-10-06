import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { OnboardingPermissionsClient } from "@/components-next/onboarding-permissions-client";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app onboarding/permissions: location + notification consent then welcome. */
export default async function OnboardingPermissionsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  return (
    <main className="main">
      <h1>{ar ? "الأذونات" : "Permissions"}</h1>
      <p>{ar ? "نطلب الحد الأدنى لتعمل الخدمة — يمكنك التخطي دائماً." : "We ask for the minimum needed — you can always skip."}</p>
      <OnboardingPermissionsClient locale={locale} />
    </main>
  );
}
