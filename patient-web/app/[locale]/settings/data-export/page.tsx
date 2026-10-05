import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, FileJson, HardDrive, ShieldCheck } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import styles from "../settings.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsDataExportPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await getTranslations("Settings");
  const token = await requirePatientAccess(locale);

  const response = await callPatientApi("/users/me/data-export", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();

  const payload = response.ok ? await response.json().catch(() => null) : null;

  return (
    <main className={`main ${styles.page}`}>
      <Link
        href={`/${locale}/settings`}
        style={{
          color: "#1E332E",
          fontWeight: 760,
          textDecoration: "none",
          overflowWrap: "anywhere" as any,
        }}
      >
        {ar ? "الإعدادات" : "Settings"}
      </Link>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <HardDrive size={15} aria-hidden="true" />
          {ar ? "تصدير البيانات" : "Data Export"}
        </p>
        <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
          {ar ? "تنزيل نسخة من بياناتي" : "Download a copy of my data"}
        </h1>
        <p style={{ overflowWrap: "anywhere" } as any}>
          {ar
            ? "PDPL المادة 20 — يحق لك الحصول على نسخة قابلة للقراءة آلياً من كل بياناتك."
            : "PDPL Art. 20 — you have the right to a machine-readable copy of all your data."}
        </p>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 48,
            height: 48,
            borderRadius: 16,
            background: "rgba(255,255,255,.82)",
            border: "1px solid #E8EDEE",
            flexShrink: 0,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          } as any}
        >
          <Download size={22} color="#1E332E" aria-hidden="true" />
        </span>
      </section>

      <section className={styles.card} style={{ gridTemplateColumns: "1fr" }} aria-labelledby="export-heading">
        <h2 id="export-heading">
          {ar ? "تصدير شامل" : "Complete export"}
        </h2>
        <p style={{ marginTop: 8, overflowWrap: "anywhere" } as any}>
          {ar
            ? "الملف يحتوي على: الحساب، الحجوزات، الوصفات، التقارير، المحفظة، الإشعارات، سجلات الموافقة، وغيرها. يتم استثناء كلمات المرور والرموز الحساسة."
            : "The file includes: account, bookings, prescriptions, reports, wallet, notifications, consent records, and more. Passwords and sensitive tokens are excluded."}
        </p>

        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button
            type="button"
            onClick={async () => {
              if (!payload) return;
              const blob = new Blob([JSON.stringify(payload, null, 2)], {
                type: "application/json;charset=utf-8",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `nabd-data-export-${new Date().toISOString().slice(0, 10)}.json`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              borderRadius: 20,
              border: "1px solid #E8EDEE",
              background: "#5FD9B3",
              color: "#1E332E",
              fontWeight: 800,
              fontSize: ".9rem",
              cursor: "pointer",
              overflowWrap: "anywhere",
            } as any}
          >
            <FileJson size={18} aria-hidden="true" />
            {ar ? "تنزيل JSON" : "Download JSON"}
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!payload) return;
              const csv = jsonToCsv(payload);
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `nabd-data-export-${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              borderRadius: 20,
              border: "1px solid #E8EDEE",
              background: "rgba(255,255,255,.82)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "#1E332E",
              fontWeight: 700,
              fontSize: ".9rem",
              cursor: "pointer",
              overflowWrap: "anywhere",
            } as any}
          >
            <Download size={18} aria-hidden="true" />
            {ar ? "تنزيل CSV" : "Download CSV"}
          </button>
        </div>

        {payload && (
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", color: "#555", fontSize: ".85rem" }}>
              {ar ? "عرض بنية الملف (أول 5 مجموعات)" : "Preview file structure (first 5 collections)"}
            </summary>
            <pre
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 12,
                background: "#F8FAFA",
                border: "1px solid #E8EDEE",
                overflow: "auto",
                fontSize: ".7rem",
                maxHeight: 300,
              }}
            >
              {JSON.stringify(
                Object.keys(payload.collections || {}).slice(0, 5).reduce((acc: any, key) => {
                  acc[key] = Array.isArray(payload.collections[key]) ? `${payload.collections[key].length} records` : payload.collections[key];
                  return acc;
                }, {}),
                null,
                2
              )}
            </pre>
          </details>
        )}

        <p className={styles.boundary} style={{ marginTop: 16, overflowWrap: "anywhere" } as any}>
          <ShieldCheck size={14} aria-hidden="true" style={{ verticalAlign: "middle", marginInlineEnd: 6 }} />
          {ar
            ? "PDPL المادة 20: حق نقل البيانات — يتم التصدير فوراً دون تدخل الدعم."
            : "PDPL Art. 20: Data portability — export is instant without support involvement."}
        </p>
      </section>

      <section className={styles.card} style={{ gridTemplateColumns: "1fr" }}>
        <h2>{ar ? "نقل بياناتي لمنصة أخرى" : "Port my data elsewhere"}</h2>
        <p style={{ marginTop: 8, overflowWrap: "anywhere" } as any}>
          {ar ? "صيغة JSON متوافقة مع FHIR R4 / HL7 — جاهزة للاستيراد في أنظمة صحية أخرى." : "JSON format compatible with FHIR R4 / HL7 — ready for import into other health systems."}
        </p>
        <Link
          href={`/${locale}/support/chat`}
          style={{
            display: "inline-flex",
            marginTop: 12,
            padding: "10px 16px",
            borderRadius: 20,
            background: "rgba(255,255,255,.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid #E8EDEE",
            color: "#1E332E",
            fontWeight: 700,
            fontSize: ".84rem",
            textDecoration: "none",
          } as any}
        >
          {ar ? "التواصل مع الدعم الفني" : "Contact support"}
        </Link>
      </section>
    </main>
  );
}

function jsonToCsv(obj: any): string {
  const rows: string[] = [];
  const flatten = (o: any, prefix = "") => {
    for (const [k, v] of Object.entries(o || {})) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        flatten(v, key);
      } else if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (item && typeof item === "object") {
            flatten(item, `${key}[${i}]`);
          } else {
            rows.push(`"${key}[${i}]","${String(item).replace(/"/g, '""')}"`);
          }
        });
      } else {
        rows.push(`"${key}","${String(v ?? "").replace(/"/g, '""')}"`);
      }
    }
  };
  flatten(obj);
  return "Key,Value\n" + rows.join("\n");
}