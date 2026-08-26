"use client";

import { useState } from "react";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

const RED_FLAGS = [
  ["chest_pain", "ألم صدر"], ["breathing_difficulty", "صعوبة تنفس"],
  ["fainting_or_unresponsive", "إغماء"], ["heavy_bleeding", "نزيف غزير"],
  ["new_confusion", "تشوش حديث"], ["severe_allergic_reaction", "تحسس شديد"],
  ["severe_injury", "إصابة بالغة"],
] as const;

/**
 * AI tools (parity #20): triage self-check, prescription photo translation and
 * the structured skin self-check — every submit is a real BFF POST to /ai/*.
 * Results come verbatim from the server; nothing is invented client-side.
 */
export function AiTools() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [translateResult, setTranslateResult] = useState<any>(null);
  const [skinResult, setSkinResult] = useState<any>(null);

  async function post(action: string, payload: unknown) {
    setBusy(action); setError(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر التنفيذ");
        return null;
      }
      return data;
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function triage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const redFlags = RED_FLAGS.map(([value]) => value).filter((value) => form.get(`flag_${value}`) === "on");
    const result = await post("triage", {
      kind: "triage",
      triage: {
        symptoms: String(form.get("symptoms") || ""),
        ...(String(form.get("body_region") || "") ? { body_region: String(form.get("body_region")) } : {}),
        red_flags: redFlags.length ? redFlags : ["none"],
      },
    });
    if (result) setTriageResult(result);
  }

  async function translate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = (event.currentTarget.elements.namedItem("image") as HTMLInputElement) || null;
    const file = input?.files?.[0];
    if (!file) { setError("اختر صورة الوصفة أولًا"); return; }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const result = await post("ocr-translate", { kind: "ocr-translate", image_base64: base64, target_lang: "ar" });
    if (result) setTranslateResult(result);
  }

  async function skin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const areas = ["face", "hand", "back", "body", "other"].filter((a) => form.get(`area_${a}`) === "on");
    const observations = ["new_or_changing", "growing_or_changed_colour_texture", "painful_or_itchy", "bleeding_or_crusting", "not_healing_over_four_weeks"].filter((o) => form.get(`obs_${o}`) === "on");
    const result = await post("skin-analysis", {
      kind: "skin-analysis",
      acknowledge_limitations: true,
      areas: areas.length ? areas : ["other"],
      observations: observations.length ? observations : ["none"],
      ...(String(form.get("note") || "") ? { note: String(form.get("note")) } : {}),
    });
    if (result) setSkinResult(result);
  }

  const card = "rounded-xl border border-black/10 bg-white p-4 shadow-sm";
  return (
    <div className="mt-3 grid gap-3">
      <section className={card}>
        <strong>فحص الأعراض (Triage)</strong>
        <form onSubmit={triage} style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
          <textarea name="symptoms" required minLength={2} maxLength={1000} rows={3} aria-label="الأعراض" style={fieldStyle} />
          <input name="body_region" maxLength={80} aria-label="منطقة الجسم (اختياري)" style={fieldStyle} />
          <fieldset style={{ border: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: ".6rem", fontSize: ".82rem" }}>
            <legend className="text-sm">علامات الخطر</legend>
            {RED_FLAGS.map(([value, label]) => (
              <label key={value}><input type="checkbox" name={`flag_${value}`} /> {label}</label>
            ))}
          </fieldset>
          <button type="submit" disabled={busy === "triage"} style={{ justifySelf: "start", border: "none", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" }}>
            {busy === "triage" ? "..." : "فحص"}
          </button>
        </form>
        {triageResult ? <pre className="mt-2 overflow-auto rounded-lg bg-black/5 p-2 text-xs" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(triageResult, null, 2)}</pre> : null}
      </section>

      <section className={card}>
        <strong>ترجمة وصفة طبية من صورة</strong>
        <form onSubmit={translate} style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
          <input type="file" name="image" accept="image/*" required aria-label="صورة الوصفة" style={fieldStyle} />
          <button type="submit" disabled={busy === "ocr-translate"} style={{ justifySelf: "start", border: "none", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" }}>
            {busy === "ocr-translate" ? "..." : "ترجمة الصورة"}
          </button>
        </form>
        {translateResult ? <pre className="mt-2 overflow-auto rounded-lg bg-black/5 p-2 text-xs" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(translateResult, null, 2)}</pre> : null}
      </section>

      <section className={card}>
        <strong>فحص ذاتي للجلد (بلا صور)</strong>
        <form onSubmit={skin} style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
          <fieldset style={{ border: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: ".6rem", fontSize: ".85rem" }}>
            <legend className="text-sm">المنطقة</legend>
            {[["face", "وجه"], ["hand", "يد"], ["back", "ظهر"], ["body", "جسم"], ["other", "أخرى"]].map(([value, label]) => (
              <label key={value}><input type="checkbox" name={`area_${value}`} /> {label}</label>
            ))}
          </fieldset>
          <fieldset style={{ border: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: ".6rem", fontSize: ".85rem" }}>
            <legend className="text-sm">الملاحظات</legend>
            {[["new_or_changing", "جديدة أو متغيرة"], ["growing_or_changed_colour_texture", "تنمو أو تغير لونها"], ["painful_or_itchy", "مؤلمة أو تسبب حكة"], ["bleeding_or_crusting", "تنزف أو تقشر"], ["not_healing_over_four_weeks", "لا تُشفى منذ أسابيع"]].map(([value, label]) => (
              <label key={value}><input type="checkbox" name={`obs_${value}`} /> {label}</label>
            ))}
          </fieldset>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" name="ack" required /> أقر بأن هذا فحص إرشادي وليس تشخيصًا طبيًا
          </label>
          <textarea name="note" maxLength={500} rows={2} aria-label="ملاحظة (اختياري)" style={fieldStyle} />
          <button type="submit" disabled={busy === "skin-analysis"} style={{ justifySelf: "start", border: "none", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" }}>
            {busy === "skin-analysis" ? "..." : "نتيجة إرشادية"}
          </button>
        </form>
        {skinResult ? <pre className="mt-2 overflow-auto rounded-lg bg-black/5 p-2 text-xs" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(skinResult, null, 2)}</pre> : null}
      </section>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
