"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { EmergencyContact } from "@/lib/api/emergency-contacts";
import styles from "./health.module.css";
import forms from "@/components-next/consult/consult.module.css";

/**
 * The patient's own emergency contacts (GET /health/emergency-contacts, read by the page): the list with the phone partly
 * hidden, a Remove button per contact (DELETE) and the form to add one (POST), both through /api/patient. The page reloads
 * after each change, so the list always comes from the server. The first contact added becomes the primary one, as in the app.
 */
export function EmergencyContactsEditor({ contacts }: { contacts: EmergencyContact[] }) {
  const t = useTranslations("HealthWeb");
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2 || phone.trim().length < 5) { setError(t("emergencyRequired")); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/patient/health/emergency-contacts", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-contact-${crypto.randomUUID()}` },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), ...(relation.trim() ? { relation: relation.trim() } : {}), isPrimary: contacts.length === 0 }),
        credentials: "same-origin",
      });
      if (!res.ok) { setError(t("emergencySaveError")); return; }
      setName("");
      setPhone("");
      setRelation("");
      router.refresh();
    } catch {
      setError(t("emergencySaveError"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/patient/health/emergency-contacts/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) { setError(t("itemRemoveFailed")); return; }
      router.refresh();
    } catch {
      setError(t("itemRemoveFailed"));
    }
  }

  return (
    <>
      {contacts.length === 0 ? (
        <p className={`${forms.body} ${forms.muted}`}>{t("emergencyMineEmpty")}</p>
      ) : (
        <ul className={styles.rows} aria-label={t("emergencyMine")}>
          {contacts.map((contact, index) => (
            <li key={contact.id || `${contact.name}-${index}`}>
              <div className={styles.row}>
                <FIcon icon="user" tone="peach" size={40} />
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{contact.name}{contact.isPrimary ? ` · ${t("emergencyPrimary")}` : ""}</span>
                  <span className={styles.rowSub}>{contact.relation}{contact.relation ? " · " : ""}<bdi>{contact.maskedPhone}</bdi></span>
                </span>
                {contact.id ? <Button variant="ghost" size="sm" label={t("itemRemove")} onClick={() => void remove(contact.id as string)} /> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className={forms.stack} noValidate aria-label={t("emergencyAdd")}>
        <label className={forms.field}>
          <span className={forms.label}>{t("emergencyName")}</span>
          <input className={forms.control} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="off" />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{t("emergencyPhone")}</span>
          <input className={forms.control} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" maxLength={24} dir="ltr" autoComplete="off" />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{t("emergencyRelation")}</span>
          <input className={forms.control} value={relation} onChange={(event) => setRelation(event.target.value)} maxLength={60} autoComplete="off" />
        </label>
        <Button type="submit" variant="outline" label={t("itemAdd")} loading={saving} />
        {error ? <p className={forms.error} role="alert">{error}</p> : null}
      </form>
    </>
  );
}
