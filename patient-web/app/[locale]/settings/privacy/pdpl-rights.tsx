"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../settings.module.css";

/**
 * PDPL data-subject rights (portability + erasure) for the web client.
 *
 * Apple requires account deletion on every client, and PDPL Art. 20/23 require
 * the subject to act directly rather than mailing a support ticket — which is
 * all this page previously offered. The password is required before the DELETE
 * is sent so a stolen session cookie cannot erase an account on its own.
 *
 * Styling reuses the page's existing card and adds only what is missing
 * (buttons and the confirm box) as local styles, so no new global CSS is
 * introduced and the module keeps its single-source-of-truth structure.
 */
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

const box: React.CSSProperties = {
  marginTop: 12,
  padding: 14,
  border: "1px solid #F3C2C2",
  borderRadius: 16,
  display: "grid",
  gap: 10,
};

export function PdplRights({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [busy, setBusy] = useState<"export" | "erase" | null>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function exportData() {
    setBusy("export");
    setError(null);
    try {
      const res = await fetch("/api/privacy/data-export", { cache: "no-store" });
      if (!res.ok) throw new Error(`export_failed_${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nabd-data-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(ar ? "تعذّر تجهيز الملف — حاول مرة أخرى" : "Could not prepare the file — try again");
    } finally {
      setBusy(null);
    }
  }

  async function eraseAccount() {
    if (!password) {
      setError(ar ? "أدخل كلمة المرور" : "Enter your password");
      return;
    }
    setBusy("erase");
    setError(null);
    try {
      const res = await fetch("/api/privacy/data-export", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(
          body?.message === "invalid_password"
            ? ar ? "كلمة المرور غير صحيحة" : "Incorrect password"
            : ar ? "تعذّر إتمام الحذف" : "Could not complete the deletion",
        );
        setBusy(null);
        return;
      }
      router.push(`/${locale}/login`);
    } catch {
      setError(ar ? "حدث خطأ — حاول مرة أخرى" : "Something went wrong — try again");
      setBusy(null);
    }
  }

  return (
    <section className={styles.card} style={{ gridTemplateColumns: "1fr" }} aria-labelledby="pdpl-heading">
      <h2 id="pdpl-heading">
        {ar ? "بياناتي" : "My data"}
      </h2>
      <p>
        {ar
          ? "PDPL المادة 20 (نقل البيانات) و23 (الحذف) — تقدر تصدّر كل بياناتك أو تحذف حسابك مباشرة."
          : "PDPL Art. 20 (portability) and Art. 23 (erasure) — export everything we hold, or delete your account directly."}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        <button type="button" style={btn} onClick={exportData} disabled={busy !== null}>
          {busy === "export"
            ? ar ? "جارٍ التجهيز…" : "Preparing…"
            : ar ? "تصدير كل بياناتي" : "Export all my data"}
        </button>
        <button
          type="button"
          style={dangerBtn}
          onClick={() => { setOpen((v) => !v); setError(null); }}
          disabled={busy !== null}
        >
          {ar ? "حذف حسابي نهائياً" : "Delete my account permanently"}
        </button>
      </div>

      {open && (
        <div style={box} role="group" aria-label={ar ? "تأكيد الحذف" : "Confirm deletion"}>
          <p style={{ margin: 0 }}>
            {ar
              ? "لا يمكن التراجع. السجلات المالية والقانونية تُحفظ مجهولة الهوية للامتثال النظامي."
              : "This cannot be undone. Financial and legal records are kept anonymised for compliance."}
          </p>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{ar ? "كلمة المرور" : "Password"}</span>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #D1D1D6", width: "100%" }}
            />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" style={dangerBtn} onClick={eraseAccount} disabled={busy !== null}>
              {busy === "erase" ? (ar ? "جارٍ الحذف…" : "Deleting…") : (ar ? "تأكيد الحذف" : "Confirm deletion")}
            </button>
            <button type="button" style={btn} onClick={() => setOpen(false)} disabled={busy !== null}>
              {ar ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" style={{ color: "#B3261E" }}>{error}</p>}
    </section>
  );
}
