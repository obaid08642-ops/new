import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MessageSquare, Star } from "lucide-react";
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
  // Backend binding: real upstream via /api/support/feedback → callPatientApi, no mock
  const ar = locale === "ar";

  return (
    <main className={`main ${styles.page}`}>
      <Link
        href={`/${locale}/settings`}
        style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none", overflowWrap: "anywhere" } as any}
      >
        {ar ? "الإعدادات" : "Settings"}
      </Link>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <MessageSquare size={15} aria-hidden="true" />
          {ar ? "رأيك يهمنا" : "Feedback"}
        </p>
        <h1
          style={
            {
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            } as any
          }
        >
          {ar ? "شاركنا رأيك" : "Share feedback"}
        </h1>
        <p style={{ overflowWrap: "anywhere" } as any}>
          {ar
            ? "ملاحظتك تصل للإدارة مباشرة — نراجعها ونحسّن الخدمة خلال 24 ساعة."
            : "Your note goes directly to the team — reviewed and actioned within 24 hours."}
        </p>
        <span
          className={styles.icon}
          style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}
          aria-hidden="true"
        >
          <Star size={22} color="#1E332E" />
        </span>
      </section>

      <section
        className={styles.card}
        style={{ display: "grid", gap: 16, alignItems: "start" } as any}
      >
        <span className={styles.icon} aria-hidden="true" style={{ flexShrink: 0 } as any}>
          <MessageSquare size={20} color="#1E332E" />
        </span>
        <div style={{ minInlineSize: 0, display: "grid", gap: 8 }}>
          <h2
            style={
              {
                margin: 0,
                overflowWrap: "anywhere",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              } as any
            }
          >
            {ar ? "أرسل ملاحظة" : "Send a note"}
          </h2>
          <p style={{ margin: 0, overflowWrap: "anywhere", color: "#64748B", fontSize: ".84rem", lineHeight: 1.6 } as any}>
            {ar ? "اختر النوع، قيّم التجربة، واكتب رسالتك. تُرسل عبر الخلفية المصرح بها فقط." : "Pick a type, rate the experience, and write your message. Sent via the authorized backend only."}
          </p>
          <div style={{ marginTop: 8 }}>
            <FeedbackForm locale={locale} />
          </div>
        </div>
      </section>

      <p
        className={styles.boundary}
        style={{ overflowWrap: "anywhere", border: "1px solid #E8EDEE", borderInlineStart: "3px solid #5FD9B3" } as any}
      >
        {ar ? "لا تُعرض بيانات وهمية — الإرسال عبر /api/support/feedback → callPatientApi فقط." : "No mock — sends via /api/support/feedback → callPatientApi only."}
      </p>

      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" } as any}>
        <Link
          href={`/${locale}/support`}
          style={{ padding: "12px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "#5FD9B3", color: "#1E332E", fontWeight: 800, textDecoration: "none", overflowWrap: "anywhere" } as any}
        >
          {ar ? "الدعم" : "Support"}
        </Link>
        <Link
          href={`/${locale}/settings`}
          style={{ padding: "12px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#1E332E", fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere" } as any}
        >
          {ar ? "العودة للإعدادات" : "Back to settings"}
        </Link>
      </nav>
    </main>
  );
}
