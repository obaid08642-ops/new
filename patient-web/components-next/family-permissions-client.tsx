"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type FamilyMember = { id: string; name: string; permissions: string[] };

const PERMS: Array<{ key: string; ar: string; en: string }> = [
  { key: "vitals", ar: "مشاهدة المؤشرات الحيوية", en: "View vitals" },
  { key: "meds", ar: "مشاهدة الأدوية", en: "View medications" },
  { key: "reports", ar: "مشاهدة التقارير", en: "View reports" },
  { key: "appointments", ar: "مشاهدة المواعيد", en: "View appointments" },
];

export function FamilyPermissionsClient({ locale, members }: { locale: string; members: FamilyMember[] }) {
  const router = useRouter();
  const [grants, setGrants] = useState<Record<string, string[]>>(
    Object.fromEntries(members.map((m) => [m.id, m.permissions])),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const ar = locale === "ar";

  function toggle(memberId: string, key: string) {
    setGrants((g) => {
      const current = g[memberId] || [];
      return { ...g, [memberId]: current.includes(key) ? current.filter((k) => k !== key) : [...current, key] };
    });
  }

  async function save(memberId: string) {
    setError(null);
    setSaving(memberId);
    try {
      const res = await fetch(`/api/family/members/${encodeURIComponent(memberId)}/permissions`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permissions: grants[memberId] || [] }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر حفظ الأذونات" : "Could not save permissions"));
        return;
      }
      router.refresh();
    } catch {
      setError(ar ? "تعذر حفظ الأذونات" : "Could not save permissions");
    } finally {
      setSaving(null);
    }
  }

  async function remove(memberId: string) {
    if (!window.confirm(ar ? "إزالة هذا العضو من العائلة؟" : "Remove this member from the family?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/family/members/${encodeURIComponent(memberId)}/permissions`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر الإزالة" : "Could not remove"));
        return;
      }
      router.refresh();
    } catch {
      setError(ar ? "تعذر الإزالة" : "Could not remove");
    }
  }

  if (!members.length) return <p>{ar ? "لا يوجد أعضاء بعد." : "No members yet."}</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {members.map((m) => (
        <section key={m.id} aria-label={m.name}>
          <h2>{m.name}</h2>
          {PERMS.map((p) => (
            <label key={p.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={(grants[m.id] || []).includes(p.key)}
                onChange={() => toggle(m.id, p.key)}
              />
              <span>{ar ? p.ar : p.en}</span>
            </label>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => save(m.id)} disabled={saving === m.id}>
              {saving === m.id ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}
            </button>
            <button type="button" onClick={() => remove(m.id)}>{ar ? "إزالة العضو" : "Remove member"}</button>
          </div>
        </section>
      ))}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
