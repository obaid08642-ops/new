"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { useSheetClose } from "./form-sheet";
import type { ProfileBasics, ProfileItem, ProfileListKey } from "@/lib/health/profile";
import styles from "./health.module.css";
import forms from "@/components-next/consult/consult.module.css";

/**
 * One editable list of the medical profile (the old conditions and allergies lists): add by name (POST /api/medical-profile/:list)
 * and remove (DELETE /api/medical-profile/:list/:id), the same calls as before. The page reloads its data after each.
 */
export function ProfileList({ list, title, initial }: { list: ProfileListKey; title: string; initial: ProfileItem[] }) {
  const t = useTranslations("HealthWeb");
  const router = useRouter();
  const [items, setItems] = useState<ProfileItem[]>(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) { setError(t("itemNameRequired")); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/medical-profile/${list}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) { setError(t("itemAddFailed")); return; }
      const created = ((data as { data?: { id?: unknown; name?: unknown } } | null)?.data ?? data) as { id?: unknown; name?: unknown } | null;
      setItems([...items, { id: String(created?.id || `${Date.now()}`), name: typeof created?.name === "string" && created.name ? created.name : name.trim() }]);
      setName("");
      router.refresh();
    } catch {
      setError(t("itemAddFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/medical-profile/${list}/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) { setError(t("itemRemoveFailed")); return; }
      setItems(items.filter((item) => item.id !== id));
      router.refresh();
    } catch {
      setError(t("itemRemoveFailed"));
    }
  }

  return (
    <div className={forms.section}>
      <h3 className={forms.sectionTitle}>{title}</h3>
      {items.length === 0 ? <p className={`${forms.body} ${forms.muted}`}>{t("itemsEmpty")}</p> : (
        <ul className={styles.rows} aria-label={title}>
          {items.map((item) => (
            <li key={item.id}>
              <div className={styles.row}>
                <span className={styles.rowBody}><span className={styles.rowTitle}>{item.name}</span></span>
                <Button variant="ghost" size="sm" label={t("itemRemove")} onClick={() => void remove(item.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className={styles.addRow} noValidate>
        <label className={forms.field}>
          <span className={forms.label}>{t("itemName")}</span>
          <input className={forms.control} value={name} onChange={(event) => setName(event.target.value)} maxLength={200} />
        </label>
        <Button type="submit" variant="outline" label={t("itemAdd")} loading={saving} />
      </form>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
    </div>
  );
}

const toNumber = (value: string) => (value.trim() ? Number(value) : undefined);

/** Edit the basics (height, weight, blood type): PATCH /api/medical-profile, the call the profile edit form makes. */
export function BasicsForm({ initial }: { initial: ProfileBasics }) {
  const t = useTranslations("HealthWeb");
  const router = useRouter();
  const close = useSheetClose();
  const [height, setHeight] = useState(initial.heightCm !== undefined ? String(initial.heightCm) : "");
  const [weight, setWeight] = useState(initial.weightKg !== undefined ? String(initial.weightKg) : "");
  const [blood, setBlood] = useState(initial.bloodType ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = {};
    const h = toNumber(height);
    const w = toNumber(weight);
    if ((h !== undefined && (!Number.isFinite(h) || h < 30 || h > 300)) || (w !== undefined && (!Number.isFinite(w) || w < 2 || w > 1000))) { setError(t("basicsInvalid")); return; }
    if (h !== undefined) payload.height_cm = h;
    if (w !== undefined) payload.weight_kg = w;
    if (blood.trim()) payload.blood_type = blood.trim().slice(0, 8);
    setSaving(true);
    try {
      const res = await fetch("/api/medical-profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { setError(t("basicsFailed")); return; }
      close();
      router.refresh();
    } catch {
      setError(t("basicsFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={forms.stack} noValidate>
      <label className={forms.field}>
        <span className={forms.label}>{t("basicsHeight")}</span>
        <input className={forms.control} value={height} onChange={(event) => setHeight(event.target.value)} inputMode="decimal" maxLength={6} dir="ltr" />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("basicsWeight")}</span>
        <input className={forms.control} value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" maxLength={6} dir="ltr" />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("basicsBlood")}</span>
        <input className={forms.control} value={blood} onChange={(event) => setBlood(event.target.value)} maxLength={8} dir="ltr" />
      </label>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("basicsSave")} loading={saving} fullWidth />
    </form>
  );
}
