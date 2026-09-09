import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export default async function WearablesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className="main">
      <Link href={`/${locale}/health`}>{ar ? "صحتي" : "My health"}</Link>
      <h1>{ar ? "الأجهزة القابلة للارتداء" : "Wearables"}</h1>
      <p>
        {ar
          ? "اربط ساعتك أو سوارك من تطبيق الجوال لمزامنة المؤشرات تلقائياً. يمكنك أيضاً تسجيل قراءاتك يدوياً من هنا."
          : "Pair your watch or band from the mobile app to sync automatically. You can also log readings manually here."}
      </p>
      <nav style={{ display: "flex", gap: 8 }}>
        <Link href={`/${locale}/health/vitals/log`}>{ar ? "تسجيل قراءة يدوياً" : "Log a reading manually"}</Link>
        <Link href={`/${locale}/health/vitals`}>{ar ? "سجل المؤشرات" : "Vitals history"}</Link>
      </nav>
    </main>
  );
}
