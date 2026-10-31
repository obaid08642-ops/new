"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Toggle } from "@/components-next/ui-generated/components/Controls";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rule";
import forms from "@/components-next/consult/consult.module.css";
import styles from "./settings.module.css";



/** The first problem with the three password fields, or null (the keys are in SettingsWeb). */
export function passwordProblem(current: string, next: string, repeat: string): "currentRequired" | "passwordTooShort" | "passwordMismatch" | null {
  if (!current) return "currentRequired";
  if (next.length < MIN_PASSWORD_LENGTH) return "passwordTooShort";
  if (next !== repeat) return "passwordMismatch";
  return null;
}

/** The app's change-password sheet as a card form: current, new and repeated password; the BFF keeps this browser signed in. */
export function ChangePasswordForm() {
  const t = useTranslations("SettingsWeb");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const liveMismatch = repeat.length > 0 && next !== repeat;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setDone(false);
    const problem = passwordProblem(current, next, repeat);
    if (problem) { setError(t(problem)); return; }
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/settings/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ current_password: current, new_password: next }) });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(response.status === 401 && body?.message !== "authentication_required" ? t("currentWrong") : t("passwordChangeFailed"));
        return;
      }
      setCurrent(""); setNext(""); setRepeat(""); setDone(true);
    } catch { setError(t("passwordChangeFailed")); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className={forms.stack} noValidate aria-label={t("changePasswordTitle")}>
      <h3 className={styles.itemTitle}>{t("changePasswordTitle")}</h3>
      <label className={forms.field}>
        <span className={forms.label}>{t("currentPassword")}</span>
        <input className={forms.control} type="password" value={current} autoComplete="current-password" dir="ltr" onChange={(event) => setCurrent(event.target.value)} />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("newPassword")}</span>
        <input className={forms.control} type="password" value={next} autoComplete="new-password" dir="ltr" onChange={(event) => setNext(event.target.value)} />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("repeatPassword")}</span>
        <input className={forms.control} type="password" value={repeat} autoComplete="new-password" dir="ltr" aria-invalid={liveMismatch || undefined} onChange={(event) => setRepeat(event.target.value)} />
      </label>
      {liveMismatch ? <p className={forms.error} role="alert">{t("passwordMismatch")}</p> : null}
      {error && !liveMismatch ? <p className={forms.error} role="alert">{error}</p> : null}
      {done ? <p className={styles.hint} role="status">{t("passwordChanged")}</p> : null}
      <Button type="submit" label={t("savePassword")} variant="primary" fullWidth loading={busy} />
    </form>
  );
}

/** The two-factor switch (PATCH /users/me/security-settings); a failed save puts it back and says so. */
export function TwoFactorToggle({ initial }: { initial: boolean }) {
  const t = useTranslations("SettingsWeb");
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function save(next: boolean) {
    if (busy) return;
    setBusy(true); setFailed(false); setValue(next);
    try {
      const response = await fetch("/api/settings/security", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ two_factor: next }) });
      if (!response.ok) throw new Error("save_failed");
    } catch { setValue(!next); setFailed(true); }
    finally { setBusy(false); }
  }

  return <>
    <Toggle label={t("twoFactor")} value={value} loading={busy} onChange={(next) => void save(next)} />
    {failed ? <p className={styles.error} role="alert">{t("saveFailed")}</p> : null}
  </>;
}
