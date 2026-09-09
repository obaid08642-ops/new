import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export default async function ProviderInfoPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";

  return (
    <main className="main">
      <h1>{ar ? "انضم كمقدم خدمة" : "Join as a provider"}</h1>
      <p>
        {ar
          ? "الأطباء والصيدليات والمختبرات والممرضون: سجّلوا عبر تطبيق مزودي نبض بلس لإدارة خدماتكم واستقبال الطلبات."
          : "Doctors, pharmacies, labs, and nurses: register via the Nabd Plus provider app to manage services and receive orders."}
      </p>
      <nav style={{ display: "flex", gap: 8 }}>
        <Link href={`/${locale}/login`}>{ar ? "الاستمرار كمريض" : "Continue as patient"}</Link>
        <Link href={`/${locale}/support`}>{ar ? "تواصل للتسجيل كمقدم خدمة" : "Contact us to register as a provider"}</Link>
      </nav>
    </main>
  );
}
