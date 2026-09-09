"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type ProfileItem = { id: string; name: string };

export function MedicalProfileListClient({
  locale,
  list,
  title,
  initial,
}: {
  locale: string;
  list: "chronic-diseases" | "allergies" | "surgeries" | "long-term-medications";
  title: string;
  initial: ProfileItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ProfileItem[]>(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError(ar ? "أدخل الاسم قبل الإضافة." : "Type the name before adding.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/medical-profile/${list}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر الإضافة" : "Could not add"));
        return;
      }
      const created = (data as { data?: { id?: string; name?: string }; id?: string; name?: string })?.data ?? data;
      const id = String((created as { id?: unknown })?.id || `${Date.now()}`);
      setItems([...items, { id, name: (created as { name?: string })?.name || name.trim() }]);
      setName("");
      router.refresh();
    } catch {
      setError(ar ? "تعذر الإضافة" : "Could not add");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/medical-profile/${list}/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data as { message?: string })?.message || (ar ? "تعذر الحذف" : "Could not delete"));
        return;
      }
      setItems(items.filter((i) => i.id !== id));
      router.refresh();
    } catch {
      setError(ar ? "تعذر الحذف" : "Could not delete");
    }
  }

  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      {items.length === 0 ? <p>{ar ? "لا يوجد بعد." : "None yet."}</p> : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {items.map((i) => (
            <li key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>{i.name}</span>
              <button type="button" onClick={() => remove(i.id)}>{ar ? "حذف" : "Delete"}</button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder={ar ? "الاسم" : "Name"} />
        <button type="submit" disabled={saving}>{saving ? (ar ? "جارٍ..." : "Saving...") : (ar ? "إضافة" : "Add")}</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
