import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsDocumentUpload } from "@/components-next/diagnostics-document-upload";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ bookingId?: string }> };

export default async function DiagnosticsInsuranceUploadPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const bookingId = (sp.bookingId || "").trim();
  if (!isLocale(locale) || !bookingId) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className="main">
      <Link href={`/${locale}/diagnostics/bookings`}>{ar ? "حجوزاتي" : "My bookings"}</Link>
      <h1>{ar ? "رفع مستند التأمين" : "Upload insurance document"}</h1>
      <p>
        {ar
          ? "التأمين للسحب المنزلي يتطلب طلب طبيب أو موافقة مسبقة. ارفع المستند هنا."
          : "Home-collection insurance requires a doctor request or pre-approval. Upload it here."}
      </p>
      <DiagnosticsDocumentUpload locale={locale} bookingId={bookingId} />
    </main>
  );
}
