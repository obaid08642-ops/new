import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { FamilyScanClient } from "@/components-next/family-scan-client";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { VectorFamily } from "@/components-next/vector-illustrations";
import styles from "../family.module.css";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app family/scan: QR invite scan; web accepts pasted code/link then opens join. */
export default async function FamilyScanPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <Link className={styles.back} href={`/${locale}/family/invite`}><Icon name="caret-left" size={16} />{ar ? "دعوة" : "Invite"}</Link>
      <section className={styles.intro} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20, background: "linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 60%, #E7FFF6 100%)" }}>
        <div className={styles.introText}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", overflowWrap: "anywhere" }}><Icon name="shield-check" size={15} />{ar ? "دعوة العائلة" : "Invite"}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{ar ? "مسح دعوة العائلة" : "Scan family invite"}</h1>
          <p style={{ overflowWrap: "anywhere" }}>{ar ? "الصق كود الدعوة أو رابط QR للانضمام الفوري — يتم التحقق عبر الخادم." : "Paste an invite code or QR link — verified server-side."}</p>
        </div>
        <div className={styles.introVector}><VectorFamily size={48} aria-hidden="true" /></div>
      </section>
      <section className={styles.detail} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20, background: "var(--nabd-bg.surface-light)" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px", overflowWrap: "anywhere", color: "#1E332E" } as React.CSSProperties}><Icon name="qr-code" size={17} />{ar ? "المسح" : "Scan"}</h2>
        <FamilyScanClient locale={locale} />
      </section>
    </main>
  );
}
