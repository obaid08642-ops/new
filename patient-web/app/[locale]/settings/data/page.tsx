import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Parity with app settings/data: real storage usage + rights; destructive/export actions route to support (no silent no-ops). */
export default async function SettingsDataPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/users/me/storage", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const payload = response.ok ? asRecord(await response.json().catch(() => null)) : null;
  const rec = asRecord(payload?.data) ?? payload;
  const itemsRaw = rec && Array.isArray(rec.items) ? rec.items : [];
  const items = itemsRaw.flatMap((it) => {
    const o = asRecord(it);
    if (!o) return [];
    return [{
      label: typeof o.label === "string" ? o.label : "",
      val: typeof o.val === "string" ? o.val : "",
      pct: Number(o.pct ?? 0) || 0,
    }];
  });
  const total = rec && typeof rec.total === "string" ? rec.total : "0 MB";
  return (
    <main className="main">
      <Link href={`/${locale}/settings`}>{ar ? "الإعدادات" : "Settings"}</Link>
      <h1>{ar ? "إدارة بياناتي" : "Manage my data"}</h1>
      <p>{ar ? "لك الحق في الوصول لبياناتك وتصحيحها ونقلها وحذفها وفق نظام حماية البيانات." : "You have the right to access, correct, port and delete your data."}</p>
      <section aria-label={ar ? "مساحة البيانات المستخدمة" : "Storage used"}>
        <h2>{ar ? "مساحة البيانات المستخدمة" : "Storage used"}</h2>
        {items.length === 0 ? (
          <p role="status">{ar ? "جارٍ التحميل…" : "Loading…"}</p>
        ) : (
          <ul>
            {items.map((it, i) => (
              <li key={i}>{it.label}: {it.val} ({it.pct}%)</li>
            ))}
          </ul>
        )}
        <p>{ar ? `الإجمالي: ${total} من 2 GB` : `Total: ${total} of 2 GB`}</p>
      </section>
      <section aria-label={ar ? "إجراءات البيانات" : "Data actions"}>
        <h2>{ar ? "إجراءات البيانات" : "Data actions"}</h2>
        <ul>
          <li>
            <strong>{ar ? "تحميل نسخة من بياناتي" : "Download a copy of my data"}</strong>
            <p>{ar ? "JSON/PDF — اطلبها عبر الدعم وتصلك خلال 24 ساعة." : "JSON/PDF — request via support, delivered within 24 hours."}</p>
            <Link href={`/${locale}/support/chat`}>{ar ? "طلب عبر الدعم" : "Request via support"}</Link>
          </li>
          <li>
            <strong>{ar ? "نقل بياناتي لمنصة أخرى" : "Port my data elsewhere"}</strong>
            <p>FHIR R4/HL7 — {ar ? "اطلبها عبر الدعم." : "request via support."}</p>
            <Link href={`/${locale}/support/chat`}>{ar ? "طلب عبر الدعم" : "Request via support"}</Link>
          </li>
          <li>
            <strong>{ar ? "ما البيانات التي نجمعها؟" : "What data do we collect?"}</strong>
            <p><Link href={`/${locale}/privacy`}>{ar ? "راجع سياسة الخصوصية" : "Review the privacy policy"}</Link></p>
          </li>
          <li>
            <strong>{ar ? "حذف بياناتي نهائياً" : "Delete my data permanently"}</strong>
            <p>{ar ? "لا يمكن التراجع — يتم عبر الدعم مع تحقق الهوية." : "Irreversible — handled via support with identity verification."}</p>
            <Link href={`/${locale}/support/chat`}>{ar ? "طلب عبر الدعم" : "Request via support"}</Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
