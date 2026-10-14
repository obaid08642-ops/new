"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import forms from "@/components-next/consult/consult.module.css";
import styles from "./settings.module.css";

/**
 * PDPL Art. 20 (portability): downloads everything held about the patient (GET /api/privacy/data-export). The file name is
 * a file name, not a text the patient reads.
 */
export function DataExport() {
  const t = useTranslations("SettingsWeb");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function exportData() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/privacy/data-export", { cache: "no-store" });
      if (!res.ok) throw new Error(`export_failed_${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nabd-data-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.stack}>
      <p className={forms.body}>{t("exportBody")}</p>
      <Button label={t("exportButton")} variant="outline" fullWidth loading={busy} onClick={() => void exportData()} />
      {failed ? <p className={styles.error} role="alert">{t("exportFailed")}</p> : null}
    </div>
  );
}

/**
 * PDPL Art. 23 (erasure): the password is required before the DELETE is sent, so a stolen session cookie cannot erase an
 * account on its own. On success the person lands on sign-in (the BFF already dropped the cookies).
 */
export function DeleteAccount({ locale }: { locale: string }) {
  const t = useTranslations("SettingsWeb");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function eraseAccount(event: FormEvent) {
    event.preventDefault();
    if (!password) { setError(t("deletePasswordRequired")); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/privacy/data-export", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message === "invalid_password" ? t("deletePasswordWrong") : t("deleteFailed"));
        setBusy(false);
        return;
      }
      router.push(`/${locale}/login`);
    } catch {
      setError(t("deleteGeneric"));
      setBusy(false);
    }
  }

  return (
    <div className={styles.dangerBox}>
      <h3 className={styles.dangerTitle}>{t("deleteTitle")}</h3>
      <p className={forms.body}>{t("deleteBody")}</p>
      {open ? (
        <form onSubmit={eraseAccount} className={forms.stack} noValidate aria-label={t("deleteConfirmLabel")}>
          <label className={forms.field}>
            <span className={forms.label}>{t("deletePassword")}</span>
            <input className={forms.control} type="password" value={password} autoComplete="current-password" dir="ltr" onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <p className={forms.error} role="alert">{error}</p> : null}
          <Button type="submit" label={t("deleteConfirm")} variant="danger" fullWidth loading={busy} />
          <Button label={t("cancel")} variant="outline" fullWidth disabled={busy} onClick={() => { setOpen(false); setError(null); setPassword(""); }} />
        </form>
      ) : (
        <Button label={t("deleteButton")} variant="danger" fullWidth onClick={() => setOpen(true)} />
      )}
    </div>
  );
}
