"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };
const btnStyle = { justifySelf: "start", border: "none", cursor: "pointer", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" } as React.CSSProperties;

/**
 * Nutrition forms (parity #18): meal / water / profile-target writes via
 * BFF POST /api/nutrition/logs — server-validated, page refresh after save.
 */
export function NutritionForms() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(kind: "meal" | "water" | "profile", event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { kind };
    for (const [name, value] of form.entries()) {
      if (typeof value !== "string" || value.trim() === "") continue;
      payload[name] = name === "goal" || name === "meal_type" ? value : value;
    }
    setBusy(kind); setError(null); setDone(null);
    try {
      const res = await fetch("/api/nutrition/logs", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر التسجيل");
        return;
      }
      setDone(kind);
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
        <strong>تسجيل وجبة</strong>
        <form onSubmit={(e) => submit("meal", e)} style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
          <input name="name" required minLength={1} maxLength={200} aria-label="اسم الوجبة" style={fieldStyle} />
          <select name="meal_type" aria-label="نوع الوجبة" style={fieldStyle}>
            <option value="breakfast">فطور</option>
            <option value="lunch">غداء</option>
            <option value="dinner">عشاء</option>
            <option value="snack">سناك</option>
          </select>
          <input type="number" name="calories" min={0} max={10000} aria-label="السعرات" style={fieldStyle} />
          <button type="submit" disabled={busy === "meal"} style={btnStyle}>{busy === "meal" ? "..." : "سجّل الوجبة"}</button>
        </form>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <strong>شرب الماء</strong>
        <form onSubmit={(e) => submit("water", e)} style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
          <label className="text-sm">الكمية (مل) — كوب 250 مل
            <input type="number" name="amount_ml" min={50} max={3000} defaultValue={250} required style={{ ...fieldStyle, marginTop: ".25rem" }} />
          </label>
          <button type="submit" disabled={busy === "water"} style={btnStyle}>{busy === "water" ? "..." : "سجّل الماء"}</button>
        </form>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm md:col-span-2">
        <strong>الهدف والوزن المستهدف</strong>
        <form onSubmit={(e) => submit("profile", e)} className="mt-2 grid gap-2 md:grid-cols-4">
          <select name="goal" aria-label="الهدف" style={fieldStyle}>
            <option value="weight_loss">خسارة وزن</option>
            <option value="muscle_gain">بناء عضل</option>
            <option value="healthy_lifestyle">نمط صحي</option>
            <option value="maintain">حافظ</option>
          </select>
          <input type="number" name="height_cm" min={50} max={260} aria-label="الطول سم" style={fieldStyle} />
          <input type="number" name="weight_kg" min={15} max={500} step={0.1} aria-label="الوزن الحالي كجم" style={fieldStyle} />
          <input type="number" name="target_weight_kg" min={15} max={500} step={0.1} aria-label="الوزن المستهدف كجم" style={fieldStyle} />
          <button type="submit" disabled={busy === "profile"} style={{ ...btnStyle, gridColumn: "1 / -1", justifySelf: "end" }}>{busy === "profile" ? "..." : "حفظ الأهداف"}</button>
        </form>
      </section>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {done ? <p role="status" className="text-sm text-emerald-700">تم الحفظ</p> : null}
    </div>
  );
}
