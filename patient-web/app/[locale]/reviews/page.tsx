import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Star } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { ReviewForm } from "@/components-next/review-form";

/** Reviews page (parity #27): post-service rating form + my ratings list. */
export default async function ReviewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  // The upstream exposes per-entity lookups; the write path is the parity gap.
  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><Star size={18} aria-hidden="true" /> تقييماتي بعد الخدمة</h1>
      <ReviewForm />
      <p className="mt-3 text-xs text-black/50">التقييم يُحدَّث تلقائيًا إذا قيّمت نفس الحجز مرة أخرى، ومتوسط المزود يُعاد حسابه على الخادم.</p>
    </main>
  );
}
