import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { FamilyPermissionRequestsClient } from "@/components-next/family-permission-requests-client";
import { ChevronLeft, ShieldCheck, Bell } from "lucide-react";
import { VectorFamily } from "@/components-next/vector-illustrations";
import styles from "../family.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function FamilyPermissionRequestsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/family/permissions/pending", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const raw = response.ok ? await response.json().catch(() => null) : null;
  const list = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data;
  const requests = (Array.isArray(list) ? list : []).map((r: unknown) => {
    const v = r as Record<string, unknown>;
    const id = String(v.id ?? v._id ?? v.request_id ?? "");
    if (!id) return null;
    const perms = Array.isArray(v.permissions) ? v.permissions.filter((p): p is string => typeof p === "string") : [];
    return {
      id,
      memberName: typeof v.member_name === "string" ? v.member_name : typeof v.requester_name === "string" ? v.requester_name : undefined,
      permissions: perms,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <main className={`main ${styles.page}`}>
      <Link className={styles.back} href={`/${locale}/family/permissions`}><ChevronLeft size={16} aria-hidden="true" />{ar ? "الأذونات" : "Permissions"}</Link>
      <section className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{ar ? "طلبات وصول" : "Access requests"}</p>
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{ar ? "طلبات الأذونات المعلقة" : "Pending permission requests"}</h1>
          <p style={{ overflowWrap: "anywhere" }}>{ar ? "وافق أو ارفض من الخادم — لا تخزين محلي." : "Approve or deny server-side — no local persistence."}</p>
        </div>
        <div className={styles.introVector}><VectorFamily size={80} /></div>
      </section>
      <section className={styles.detail}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px", overflowWrap: "anywhere" as any }}><Bell size={17} aria-hidden="true" />{ar ? "الطلبات" : "Requests"} {requests.length ? `(${requests.length})` : ""}</h2>
        <FamilyPermissionRequestsClient locale={locale} requests={requests} />
      </section>
    </main>
  );
}
