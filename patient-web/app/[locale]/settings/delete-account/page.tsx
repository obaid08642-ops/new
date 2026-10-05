"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldAlert, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import styles from "../settings.module.css";

type Props = { params: Promise<{ locale: string }> };

const btn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 20,
  border: "1px solid #E8EDEE",
  background: "rgba(255,255,255,.82)",
  color: "#1E332E",
  fontWeight: 700,
  cursor: "pointer",
  overflowWrap: "anywhere",
};

const dangerBtn: React.CSSProperties = { ...btn, borderColor: "#F3C2C2", color: "#B3261E" };
const successBtn: React.CSSProperties = { ...btn, borderColor: "#A8E6A8", color: "#1E7A1E", background: "#E8F5E9" };

const box: React.CSSProperties = {
  marginTop: 12,
  padding: 14,
  border: "1px solid #F3C2C2",
  borderRadius: 16,
  display: "grid",
  gap: 10,
};

const infoBox: React.CSSProperties = {
  marginTop: 12,
  padding: 14,
  border: "1px solid #A8E6A8",
  borderRadius: 16,
  display: "grid",
  gap: 10,
  background: "#F0FDF0",
};

export default function SettingsDeleteAccountPage({ params }: Props) {
  const locale = (async () => {
    const p = await params;
    return p.locale;
  })();

  return <DeleteAccountClient locale={locale} />;
}

function DeleteAccountClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [step, setStep] = useState<"confirm" | "password" | "done">("confirm");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function eraseAccount() {
    if (!password) {
      setError(ar ? "أدخل كلمة المرور" : "Enter your password");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/privacy/data-export", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, reason: reason || undefined }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string; code?: string } | null;
        if (body?.code === "reauthentication_required" || body?.message === "reauthentication_required") {
          setError(
            ar
              ? "هذا الحساب يسجل الدخول بمزود خارجي وليس لديه كلمة مرور. يرجى تعيين كلمة مرور أولاً أو التواصل مع الدعم."
              : "This account signs in with an external provider and has no password. Please set a password first or contact support."
          );
        } else if (body?.message === "invalid_password") {
          setError(ar ? "كلمة المرور غير صحيحة" : "Incorrect password");
        } else {
          setError(ar ? "تعذّر إتمام الحذف" : "Could not complete the deletion");
        }
        setBusy(false);
        return;
      }
      setStep("done");
    } catch {
      setError(ar ? "حدث خطأ — حاول مرة أخرى" : "Something went wrong — try again");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            <CheckCircle size={15} aria-hidden="true" style={{ color: "#1E7A1E" }} />
            {ar ? "تم الحذف" : "Account deleted"}
          </p>
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
            {ar ? "تم حذف حسابك نهائياً" : "Your account has been permanently deleted"}
          </h1>
          <p style={{ overflowWrap: "anywhere" } as any}>
            {ar
              ? "شكراً لاستخدامك نبض. بياناتك الشخصية أُزيلت، والسجلات المالية والقانونية أُبقيت مجهولة الهوية للامتثال النظامي."
              : "Thank you for using Nabd. Your personal data has been removed; financial and legal records were kept anonymised for compliance."}
          </p>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "#E8F5E9",
              border: "1px solid #A8E6A8",
              flexShrink: 0,
            } as any}
          >
            <CheckCircle size={22} color="#1E7A1E" aria-hidden="true" />
          </span>
        </section>

        <section className={styles.card} style={{ gridTemplateColumns: "1fr", textAlign: "center" }}>
          <p style={{ marginTop: 16 }}>
            {ar ? "سيتم توجيهك إلى صفحة تسجيل الدخول خلال لحظات…" : "You will be redirected to the login page shortly…"}
          </p>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/login`)}
            style={{
              ...btn,
              marginTop: 16,
              background: "#5FD9B3",
              borderColor: "#E8EDEE",
            } as any}
          >
            {ar ? "الذهاب لتسجيل الدخول" : "Go to login"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <ShieldAlert size={15} aria-hidden="true" style={{ color: "#B3261E" }} />
          {ar ? "حذف الحساب" : "Delete account"}
        </p>
        <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
          {ar ? "حذف حسابي نهائياً" : "Delete my account permanently"}
        </h1>
        <p style={{ overflowWrap: "anywhere" } as any}>
          {ar
            ? "هذا الإجراء لا يمكن التراجع عنه. اقرأ التفاصيل أدناه قبل المتابعة."
            : "This action cannot be undone. Read the details below before proceeding."}
        </p>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 48,
            height: 48,
            borderRadius: 16,
            background: "#FEF2F2",
            border: "1px solid #F3C2C2",
            flexShrink: 0,
          } as any}
        >
          <Trash2 size={22} color="#B3261E" aria-hidden="true" />
        </span>
      </section>

      <section className={styles.card} style={{ gridTemplateColumns: "1fr" }} aria-labelledby="delete-heading">
        <h2 id="delete-heading">{ar ? "ما سيحدث عند الحذف" : "What happens when you delete"}</h2>
        <ul style={{ marginTop: 12, paddingInlineStart: 20, display: "grid", gap: 8 }}>
          <li style={{ overflowWrap: "anywhere" }}>
            {ar
              ? "الملف الشخصي، السجل الطبي، الوصفات، والتقارير تُحذف فوراً."
              : "Profile, medical records, prescriptions, and reports are deleted immediately."}
          </li>
          <li style={{ overflowWrap: "anywhere" }}>
            {ar
              ? "الجلسات ورموز الإشعارات (Push tokens) تُبطل فوراً — تسجيل خروج من كل الأجهزة."
              : "Sessions and push tokens are revoked immediately — signed out from all devices."}
          </li>
          <li style={{ overflowWrap: "anywhere" }}>
            {ar
              ? "الفواتير والسجلات المالية والقانونية تُحفظ مجهولة الهوية (بدون اسم/هاتف/بريد) للامتثال النظامي (PDPL، ZATCA، قوانين الضرائب)."
              : "Invoices and financial/legal records are kept anonymised (no name/phone/email) for regulatory compliance (PDPL, ZATCA, tax laws)."}
          </li>
          <li style={{ overflowWrap: "anywhere" }}>
            {ar
              ? "فترة سماح 30 يوماً: يمكنك التراجع بالتواصل مع الدعم خلال 30 يوماً لاستعادة الحساب قبل الحذف النهائي من النسخ الاحتياطية."
              : "30-day grace period: you can contact support within 30 days to restore the account before hard deletion from backups."}
          </li>
          <li style={{ overflowWrap: "anywhere" }}>
            {ar
              ? "الاشتراكات النشطة تُلغى تلقائياً، والمبالغ المستحقة تُعالج وفق السياسة."
              : "Active subscriptions are cancelled automatically; any dues are handled per policy."}
          </li>
        </ul>
      </section>

      <section className={styles.card} style={{ gridTemplateColumns: "1fr" }}>
        <h2>{ar ? "سبب الحذف (اختياري)" : "Reason for deletion (optional)"}</h2>
        <p style={{ marginTop: 8, fontSize: ".85rem", color: "#555" }}>
          {ar ? "يساعدنا في تحسين الخدمة — لا يُشارك مع أي طرف خارجي." : "Helps us improve the service — not shared with any third party."}
        </p>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{
            marginTop: 8,
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #D1D1D6",
            background: "rgba(255,255,255,.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            fontSize: ".9rem",
            color: "#1E332E",
          } as any}
        >
          <option value="">{ar ? "اختر السبب" : "Select reason"}</option>
          <option value="no_longer_needed">{ar ? "لم أعد بحاجة للخدمة" : "No longer need the service"}</option>
          <option value="privacy_concerns">{ar ? "مخاوف الخصوصية" : "Privacy concerns"}</option>
          <option value="switching_provider">{ar ? "أنتقل لمزود آخر" : "Switching to another provider"}</option>
          <option value="technical_issues">{ar ? "مشاكل تقنية متكررة" : "Recurring technical issues"}</option>
          <option value="cost">{ar ? "التكلفة" : "Cost"}</option>
          <option value="other">{ar ? "أخرى" : "Other"}</option>
        </select>
      </section>

      {step === "confirm" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <button
            type="button"
            style={dangerBtn}
            onClick={() => setStep("password")}
            disabled={busy}
          >
            {ar ? "متابعة لحذف الحساب" : "Continue to delete account"}
          </button>
        </div>
      )}

      {step === "password" && (
        <div style={box} role="group" aria-label={ar ? "تأكيد الحذف" : "Confirm deletion"}>
          <p style={{ margin: 0 }}>
            <AlertCircle size={16} aria-hidden="true" style={{ verticalAlign: "middle", marginInlineEnd: 6, color: "#B3261E" }} />
            {ar
              ? "لا يمكن التراجع. السجلات المالية والقانونية تُحفظ مجهولة الهوية للامتثال النظامي. فترة سماح 30 يوماً للتراجع عبر الدعم."
              : "This cannot be undone. Financial and legal records are kept anonymised for compliance. 30-day grace period to restore via support."}
          </p>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{ar ? "كلمة المرور" : "Password"}</span>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder={ar ? "أدخل كلمة المرور" : "Enter your password"}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #D1D1D6", width: "100%" }}
            />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" style={dangerBtn} onClick={eraseAccount} disabled={busy}>
              {busy ? (ar ? "جارٍ الحذف…" : "Deleting…") : (ar ? "تأكيد الحذف النهائي" : "Confirm permanent deletion")}
            </button>
            <button type="button" style={btn} onClick={() => { setStep("confirm"); setError(null); }} disabled={busy}>
              {ar ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" style={{ color: "#B3261E", marginTop: 12 }}>{error}</p>}
    </main>
  );
}