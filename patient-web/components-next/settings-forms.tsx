"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

const CATEGORIES = ["appointments", "orders", "pharmacy", "insurance", "marketing"] as const;
const CHANNELS = ["push", "sms", "email"] as const;

type NotifSettings = { channels?: Record<string, boolean>; categories?: Record<string, boolean> };

/**
 * Settings forms (parity #28): allowlisted profile patch (incl. account
 * language sync) and notification channel/category preferences — real PATCHes
 * through the BFF; the page refresh shows the stored values.
 */
export function SettingsForms({ profile, notif }: {
  profile: { display_name?: string; locale?: string; gender?: string; birth_date?: string; height_cm?: number; weight_kg?: number };
  notif: NotifSettings;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function patch(kind: "profile" | "notifications", payload: Record<string, unknown>) {
    setBusy(kind); setError(null); setDone(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ kind, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر الحفظ");
        return;
      }
      setDone(kind === "profile" ? "تم حفظ الملف" : "تم حفظ تفضيلات الإشعارات");
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(null);
    }
  }

  const profileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const name of ["display_name", "locale", "gender", "birth_date"]) {
      const value = String(form.get(name) || "");
      if (value) payload[name] = value;
    }
    for (const name of ["height_cm", "weight_kg"]) {
      const value = String(form.get(name) || "");
      if (value) payload[name] = Number(value);
    }
    void patch("profile", payload);
  };

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <strong>الملف الشخصي</strong>
        <form onSubmit={profileSubmit} className="mt-2 grid gap-2">
          <input name="display_name" defaultValue={profile.display_name || ""} maxLength={160} aria-label="الاسم المعروض" style={fieldStyle} />
          <label className="text-sm">لغة الحساب (متزامنة)
            <select name="locale" defaultValue={profile.locale || "ar"} style={{ ...fieldStyle, marginTop: ".25rem" }}>
              {[["ar", "العربية"], ["en", "English"], ["ur", "اردو"], ["hi", "हिन्दी"], ["bn", "বাংলা"], ["fil", "Filipino"]].map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select name="gender" defaultValue={profile.gender || ""} aria-label="الجنس" style={fieldStyle}>
              <option value="">الجنس…</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
            <input type="date" name="birth_date" defaultValue={profile.birth_date || ""} aria-label="تاريخ الميلاد" style={fieldStyle} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" name="height_cm" min={50} max={260} defaultValue={profile.height_cm ?? ""} aria-label="الطول سم" style={fieldStyle} />
            <input type="number" name="weight_kg" min={15} max={500} step={0.1} defaultValue={profile.weight_kg ?? ""} aria-label="الوزن كجم" style={fieldStyle} />
          </div>
          <button type="submit" disabled={busy === "profile"} className="justify-self-start rounded-full bg-[#087f8c] px-5 py-2 font-bold text-white">
            {busy === "profile" ? "..." : "حفظ الملف"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <strong>تفضيلات الإشعارات</strong>
        <form onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const channels: Record<string, boolean> = {};
          for (const ch of CHANNELS) channels[ch] = form.get(`ch_${ch}`) === "on";
          const categories: Record<string, boolean> = {};
          for (const cat of CATEGORIES) categories[cat] = form.get(`cat_${cat}`) === "on";
          void patch("notifications", { channels, categories });
        }} className="mt-2 grid gap-2 text-sm">
          <fieldset className="flex flex-wrap gap-3" style={{ border: "none", padding: 0 }}>
            <legend className="mb-1">القنوات</legend>
            {CHANNELS.map((ch) => (
              <label key={ch}><input type="checkbox" name={`ch_${ch}`} defaultChecked={notif.channels?.[ch] !== false} /> {ch}</label>
            ))}
          </fieldset>
          <fieldset className="flex flex-wrap gap-3" style={{ border: "none", padding: 0 }}>
            <legend className="mb-1">الفئات</legend>
            {CATEGORIES.map((cat) => (
              <label key={cat}><input type="checkbox" name={`cat_${cat}`} defaultChecked={notif.categories?.[cat] !== false} /> {cat}</label>
            ))}
          </fieldset>
          <button type="submit" disabled={busy === "notifications"} className="justify-self-start rounded-full bg-[#087f8c] px-5 py-2 font-bold text-white">
            {busy === "notifications" ? "..." : "حفظ التفضيلات"}
          </button>
        </form>
      </section>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {done ? <p role="status" className="text-sm text-emerald-700">{done}</p> : null}
    </div>
  );
}
