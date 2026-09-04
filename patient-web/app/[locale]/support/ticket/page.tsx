import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ChevronLeft, LifeBuoy, MessageSquare, Clock } from "lucide-react";
import { VectorSupport } from "@/components-next/vector-illustrations";
import styles from "../support.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("SupportTicket");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/support/tickets", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const list: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  const isAr = locale === "ar";

  return (
    <main className={`main ${styles.page}`}>
      <Link
        href={`/${locale}/dashboard`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--brand-deep)",
          fontWeight: 750,
          textDecoration: "none",
        }}
      >
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <LifeBuoy size={15} aria-hidden="true" />
            {isAr ? "تذاكر الدعم الفني" : "Technical Support Tickets"}
          </p>
          <h1>{t("title")}</h1>
          <p>
            {isAr
              ? "متابعة التذاكر المفتوحة والتحديثات الواردة من فريق الدعم الفني."
              : "Track active support tickets and updates from our care team."}
          </p>
        </div>
        <div className={styles.heroIllustration}>
          <VectorSupport size={80} />
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <MessageSquare size={20} aria-hidden="true" />
          {isAr ? "سجل التذاكر" : "Ticket History"}
        </h2>
        {list.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0, textAlign: "center", padding: "2rem" }}>
            {t("empty")}
          </p>
        ) : (
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {list.map((item: any, i: number) => (
              <div key={String(item?.id ?? i)} className={styles.ticketItem}>
                <div>
                  <strong className={styles.ticketSubject}>
                    {String(item?.title ?? item?.name ?? item?.type ?? item?.id ?? "")}
                  </strong>
                  {item?.created_at ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                      <Clock size={13} aria-hidden="true" />
                      {String(item.created_at).slice(0, 10)}
                    </span>
                  ) : null}
                </div>
                <span className={styles.ticketStatus}>
                  {item?.status || (isAr ? "مفتوحة" : "Open")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
