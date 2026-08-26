"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

/**
 * Security re-auth (parity #28 completion): real password rotation — the
 * current password is verified against the stored bcrypt hash upstream, and
 * biometric/2FA toggles persist via security settings.
 */
export function SecurityForms({ biometric, twoFactor }: { biometric?: boolean; twoFactor?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(kind: "password" | "security", event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    let payload: Record<string, unknown>;
    if (kind === "password") {
      payload = { kind, current_password: String(form.get("current_password") || ""), new_password: String(form.get("new_password") || "") };
      if (payload.new_password !== form.get("confirm")) { setError("التأكيد لا يطابق كلمة المرور الجديدة"); return; }
    } else {
      payload = { kind, biometric: form.get("biometric") === "on", two_factor: form.get("two_factor") === "on" };
    }
    setBusy(kind); setError(null); setDone(null);
    try {
      const res = await fetch("/api/settings/security", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر الحفظ");
        return;
      }
      setDone(kind === "password" ? "تم تغيير كلمة المرور" : "تم حفظ إعدادات الأمان");
      if (kind === "password") event.currentTarget.reset();
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <strong>تغيير كلمة المرور</strong>
        <form onSubmit={(event) => submit("password", event)} className="mt-2 grid gap-2">
          <input type="password" name="current_password" required autoComplete="current-password" aria-label="كلمة المرور الحالية" style={fieldStyle} />
          <input type="password" name="new_password" required minLength={8} autoComplete="new-password" aria-label="كلمة المرور الجديدة (8+ أحرف)" style={fieldStyle} />
          <input type="password" name="confirm" required minLength={8} autoComplete="new-password" aria-label="تأكيد كلمة المرور الجديدة" style={fieldStyle} />
          <button type="submit" disabled={busy === "password"} className="justify-self-start rounded-full bg-[#087f8c] px-5 py-2 font-bold text-white">
            {busy === "password" ? "..." : "تحديث كلمة المرور"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <strong>إعدادات الأمان</strong>
        <form onSubmit={(event) => submit("security", event)} className="mt-2 grid gap-2 text-sm">
          <label><input type="checkbox" name="two_factor" defaultChecked={twoFactor === true} /> التحقق بخطوتين عند الدخول</label>
          <label><input type="checkbox" name="biometric" defaultChecked={biometric === true} /> القياسات الحيوية على الجهاز</label>
          <button type="submit" disabled={busy === "security"} className="justify-self-start rounded-full bg-[#087f8c] px-5 py-2 font-bold text-white">
            {busy === "security" ? "..." : "حفظ"}
          </button>
        </form>
      </section>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {done ? <p role="status" className="text-sm text-emerald-700">{done}</p> : null}
    </div>
  );
}
