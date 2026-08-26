"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

/**
 * Maternity forms (parity #17): every submit is a real BFF POST to
 * /api/maternity/profile|logs — server-validated, refreshed after save.
 */
export function MaternityForms({ isPregnant, knownDueDate, locale }: { isPregnant: boolean; knownDueDate: string; locale: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function call(action: string, path: string, payload: unknown) {
    setBusy(action); setError(null); setDone(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر التسجيل");
        return;
      }
      setDone(action);
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(null);
    }
  }

  const setup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const due = String(form.get("due_date") || "");
    const lmp = String(form.get("lmp_date") || "");
    void call("setup", "/api/maternity/profile", { is_pregnant: true, ...(due ? { due_date: due } : {}), ...(lmp ? { lmp_date: lmp } : {}) });
  };
  const kick = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void call("kick", "/api/maternity/logs", { kind: "kick", count: Number(form.get("count")), duration_seconds: Number(form.get("duration")) * 60 });
  };
  const contraction = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void call("contraction", "/api/maternity/logs", { kind: "contraction", interval_seconds: Number(form.get("interval_minutes")) * 60, duration_seconds: Number(form.get("duration")) });
  };
  const growth = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { kind: "growth", month: Number(form.get("month")) };
    for (const name of ["weight_kg", "height_cm", "head_circ_cm"]) {
      if (String(form.get(name) || "") !== "") payload[name] = Number(form.get(name));
    }
    void call("growth", "/api/maternity/logs", payload);
  };

  const card = "rounded-xl border border-black/10 bg-white p-4 shadow-sm";
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <section className={card}>
        <strong>{isPregnant ? "تحديث بيانات الحمل" : "بدء متابعة حمل"}</strong>
        <form onSubmit={setup} style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
          <label className="text-sm">تاريخ الولادة المتوقع
            <input type="date" name="due_date" defaultValue={knownDueDate} style={{ ...fieldStyle, marginTop: ".25rem" }} />
          </label>
          <label className="text-sm">أو أول يوم لآخر دورة
            <input type="date" name="lmp_date" style={{ ...fieldStyle, marginTop: ".25rem" }} />
          </label>
          <button type="submit" disabled={busy === "setup"} className="justify-self-start rounded-full bg-[#087f8c] px-5 py-2 font-bold text-white">
            {busy === "setup" ? "..." : "حفظ"}
          </button>
        </form>
      </section>

      <section className={card}>
        <strong>عدّاد ركلات الجنين</strong>
        <form onSubmit={kick} style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
          <label className="text-sm">عدد الركلات
            <input type="number" name="count" min={1} max={200} required style={{ ...fieldStyle, marginTop: ".25rem" }} />
          </label>
          <label className="text-sm">مدة الجلسة بالدقائق
            <input type="number" name="duration" min={1} max={1440} required style={{ ...fieldStyle, marginTop: ".25rem" }} />
          </label>
          <button type="submit" disabled={busy === "kick"} className="justify-self-start rounded-full bg-[#087f8c] px-5 py-2 font-bold text-white">
            {busy === "kick" ? "..." : "تسجيل"}
          </button>
        </form>
      </section>

      <section className={card}>
        <strong>الانقباضات</strong>
        <form onSubmit={contraction} style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
          <label className="text-sm">الفاصل منذ السابقة (دقائق)
            <input type="number" name="interval_minutes" min={0.1} step={0.1} required style={{ ...fieldStyle, marginTop: ".25rem" }} />
          </label>
          <label className="text-sm">مدة الانقباض (ثوانٍ)
            <input type="number" name="duration" min={1} max={600} required style={{ ...fieldStyle, marginTop: ".25rem" }} />
          </label>
          <button type="submit" disabled={busy === "contraction"} className="justify-self-start rounded-full bg-[#087f8c] px-5 py-2 font-bold text-white">
            {busy === "contraction" ? "..." : "تسجيل"}
          </button>
        </form>
      </section>

      <section className={card}>
        <strong>نمو الرضيع</strong>
        <form onSubmit={growth} style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
          <label className="text-sm">الشهر
            <input type="number" name="month" min={0} max={60} required style={{ ...fieldStyle, marginTop: ".25rem" }} />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" name="weight_kg" min={0.5} max={60} step={0.01} aria-label="الوزن كجم" style={fieldStyle} />
            <input type="number" name="height_cm" min={20} max={200} step={0.1} aria-label="الطول سم" style={fieldStyle} />
            <input type="number" name="head_circ_cm" min={15} max={80} step={0.1} aria-label="محيط الرأس سم" style={fieldStyle} />
          </div>
          <button type="submit" disabled={busy === "growth"} className="justify-self-start rounded-full bg-[#087f8c] px-5 py-2 font-bold text-white">
            {busy === "growth" ? "..." : "تسجيل"}
          </button>
        </form>
      </section>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {done ? <p role="status" className="text-sm text-emerald-700">تم الحفظ</p> : null}
    </div>
  );
}
