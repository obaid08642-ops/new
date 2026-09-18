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

  if (!members.length) return <p style={{ color: "#1E332E", overflowWrap: "anywhere", margin: 0 }}>{ar ? "لا يوجد أعضاء بعد." : "No members yet."}</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {members.map((m) => (
        <section
          key={m.id}
          aria-label={m.name}
          style={{
            display: "grid",
            gap: 8,
            padding: 16,
            border: "1px solid #E8EDEE",
            borderRadius: 20,
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 8px 24px rgba(30,51,46,0.07)",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#1E332E",
              fontSize: "1rem",
              fontWeight: 800,
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {m.name}
          </h2>
          <div style={{ display: "grid", gap: 8 }}>
            {PERMS.map((p) => (
              <label
                key={p.key}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "8px 8px",
                  borderRadius: 12,
                  cursor: "pointer",
                  overflowWrap: "anywhere",
                }}
              >
                <input
                  type="checkbox"
                  checked={(grants[m.id] || []).includes(p.key)}
                  onChange={() => toggle(m.id, p.key)}
                  style={{ accentColor: "#5FD9B3", inlineSize: 16, blockSize: 16, flex: "0 0 auto" }}
                />
                <span style={{ color: "#1E332E", fontSize: ".9rem", fontWeight: 600, overflowWrap: "anywhere" }}>{ar ? p.ar : p.en}</span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => save(m.id)}
              disabled={saving === m.id}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: "1px solid #E8EDEE",
                background: "#5FD9B3",
                color: "#1E332E",
                fontWeight: 700,
                fontSize: ".9rem",
                cursor: "pointer",
                opacity: saving === m.id ? 0.7 : 1,
              }}
            >
              {saving === m.id ? (ar ? "جارٍ الحفظ..." : "Saving...") : ar ? "حفظ" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => remove(m.id)}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: "1px solid #E8EDEE",
                background: "#FDFDFC",
                color: "#1E332E",
                fontWeight: 700,
                fontSize: ".9rem",
                cursor: "pointer",
              }}
            >
              {ar ? "إزالة العضو" : "Remove member"}
            </button>
          </div>
        </section>
      ))}
      {error ? <p role="alert" style={{ color: "#B42318", background: "rgba(255,255,255,0.82)", border: "1px solid #E8EDEE", borderRadius: 16, padding: 16, margin: 0, overflowWrap: "anywhere" }}>{error}</p> : null}
    </div>
  );
}
