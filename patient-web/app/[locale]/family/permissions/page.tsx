import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { FamilyPermissionsClient } from "@/components-next/family-permissions-client";
import { ChevronLeft, ShieldCheck, UsersRound } from "lucide-react";
import { VectorFamily } from "@/components-next/vector-illustrations";
import styles from "../family.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function FamilyPermissionsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/family/my-group", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const raw = response.ok ? await response.json().catch(() => null) : null;
  const group = (raw as { data?: unknown })?.data ?? raw;
  const list = (group as { members?: unknown })?.members;
  const members = (Array.isArray(list) ? list : []).map((m: unknown) => {
    const r = m as Record<string, unknown>;
    const id = String(r.user_id ?? r.userId ?? r.id ?? r._id ?? "");
    if (!id) return null;
    const perms = Array.isArray(r.permissions) ? r.permissions.filter((p): p is string => typeof p === "string") : [];
    return {
      id,
      name: String(r.display_name ?? r.name ?? r.full_name ?? (ar ? "عضو" : "Member")),
      permissions: perms,
    };
  }).filter((m): m is { id: string; name: string; permissions: string[] } => m !== null);

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <Link className={styles.back} href={`/${locale}/family`}><ChevronLeft size={16} aria-hidden="true" />{ar ? "العائلة" : "Family"}</Link>
      <section className={styles.intro} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20, background: "linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 60%, #E7FFF6 100%)" }}>
        <div className={styles.introText}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", overflowWrap: "anywhere" }}><ShieldCheck size={15} aria-hidden="true" />{ar ? "الخصوصية والموافقات" : "Permissions"}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{ar ? "أذونات الأعضاء" : "Member permissions"}</h1>
          <p style={{ overflowWrap: "anywhere" }}>{ar ? "تحكّم بمن يرى السجل الصحي والوصفات — تُحفظ الأذونات عبر الخادم فقط." : "Control who sees health records — persisted server-side only."}</p>
        </div>
        <div className={styles.introVector}><VectorFamily size={48} aria-hidden="true" /></div>
      </section>
      <section className={styles.detail} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "#E8EDEE", borderRadius: 20, background: "#FFFFFF" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px", overflowWrap: "anywhere", color: "#1E332E" } as React.CSSProperties}><UsersRound size={17} aria-hidden="true" />{ar ? "الأعضاء" : "Members"}</h2>
        <FamilyPermissionsClient locale={locale} members={members} />
      </section>
      <Link className={styles.notice} href={`/${locale}/family/permission-requests`} style={{ overflowWrap: "anywhere", borderColor: "#E8EDEE", borderRadius: 20 } as React.CSSProperties}>{ar ? "طلبات الأذونات المعلقة ←" : "Pending permission requests →"}</Link>
    </main>
  );
}
