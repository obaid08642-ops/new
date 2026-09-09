import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ReturnRequestForm } from "@/components-next/return-request-form";

type Props = { params: Promise<{ locale: string }> };

export default async function ReturnNewRequestPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className="main">
      <Link href={`/${locale}/returns`}>{ar ? "الإرجاع" : "Returns"}</Link>
      <h1>{ar ? "طلب إرجاع جديد" : "New return request"}</h1>
      <ReturnRequestForm locale={locale} />
    </main>
  );
}
