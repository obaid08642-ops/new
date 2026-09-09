import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsCartClient } from "@/components-next/diagnostics-cart-client";

type Props = { params: Promise<{ locale: string }> };

export default async function DiagnosticsCartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className="main">
      <Link href={`/${locale}/diagnostics`}>{ar ? "التشخيص" : "Diagnostics"}</Link>
      <h1>{ar ? "سلة التحاليل" : "Tests cart"}</h1>
      <Suspense fallback={<p>{ar ? "جارٍ التحميل..." : "Loading..."}</p>}>
        <DiagnosticsCartClient locale={locale} />
      </Suspense>
    </main>
  );
}
