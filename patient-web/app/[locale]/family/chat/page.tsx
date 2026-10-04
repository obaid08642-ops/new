import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { FamilyChatClient } from "@/components-next/family-chat-client";
import { ChevronLeft, MessagesSquare, ShieldCheck } from "lucide-react";
import { VectorFamily } from "@/components-next/vector-illustrations";
import styles from "../family.module.css";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app family/chat: real backend feed polled every 5s + optimistic send. */
export default async function FamilyChatPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <Link className={styles.back} href={`/${locale}/family`}><ChevronLeft size={16} aria-hidden="true" />{ar ? "العائلة" : "Family"}</Link>
      <section className={styles.intro} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20, background: "linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 60%, #E7FFF6 100%)" }}>
        <div className={styles.introText}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", overflowWrap: "anywhere" }}><ShieldCheck size={15} aria-hidden="true" />{ar ? "تواصل العائلة" : "Family chat"}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{ar ? "محادثة العائلة" : "Family chat"}</h1>
          <p style={{ overflowWrap: "anywhere" }}>{ar ? "رسائل فورية بين أفراد المجموعة العائلية — يتم التحديث كل 5 ثوانٍ من الخادم." : "Instant family thread — polled from the server every 5s."}</p>
        </div>
        <div className={styles.introVector}><VectorFamily size={48} aria-hidden="true" /></div>
      </section>
      <section className={styles.detail} style={{ padding: 16, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20, background: "#FFFFFF" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px", overflowWrap: "anywhere", color: "#1E332E" } as React.CSSProperties}><MessagesSquare size={17} aria-hidden="true" />{ar ? "المحادثة" : "Conversation"}</h2>
        <FamilyChatClient locale={locale} />
      </section>
    </main>
  );
}
