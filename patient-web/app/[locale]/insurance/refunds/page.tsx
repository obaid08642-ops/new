import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import styles from "../insurance.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function InsuranceRefundsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/refunds/my", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const raw = response.ok ? await response.json().catch(() => null) : null;
  const list = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data;
  const refunds = (Array.isArray(list) ? list : []).map((r: unknown) => {
    const v = r as Record<string, unknown>;
    return {
      id: String(v.id ?? v._id ?? ""),
      amount: typeof v.amount === "number" ? v.amount : undefined,
      status: typeof v.status === "string" ? v.status : undefined,
      date: typeof v.createdAt === "string" ? v.createdAt : typeof v.created_at === "string" ? v.created_at : undefined,
    };
  }).filter((r) => r.id);

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/insurance`} className={styles.back}>{ar ? "التأمين" : "Insurance"}</Link>
      <h1>{ar ? "حالة الاسترداد" : "Refund status"}</h1>
      {refunds.length === 0 ? (
        <p>{ar ? "لا توجد استردادات." : "No refunds."}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {refunds.map((r) => (
            <li key={r.id}>
              <strong>{r.amount !== undefined ? r.amount : "—"}</strong>
              {r.status ? <span> · {r.status}</span> : null}
              {r.date ? <span> · {r.date}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
