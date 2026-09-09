import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { FeedbackForm } from "@/components-next/feedback-form";
import styles from "../settings.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsFeedbackPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/settings`}>
        {ar ? "الإعدادات" : "Settings"}
      </Link>
      <h1>{ar ? "شاركنا رأيك" : "Share feedback"}</h1>
      <FeedbackForm locale={locale} />
    </main>
  );
}
