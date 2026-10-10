"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";
import styles from "./family.module.css";
import { copyText } from "@/lib/copy-text";

/** Invite: creates an invite code to share (POST /api/family/invite, as before) and copies it on request. */
export function InviteTab() {
  const t = useTranslations("FamilyWeb");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setFailed(false);
    setLoading(true);
    setCopied(false);
    setCopyFailed(false);
    try {
      const res = await fetch("/api/family/invite", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setFailed(true); return; }
      setCode(String((data as { invite_code?: string } | null)?.invite_code || ""));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!code) return;
    const ok = await copyText(code);
    setCopyFailed(!ok);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className={rx.card} aria-label={t("tabInvite")}>
      <p className={rx.lead}>{t("inviteLead")}</p>
      <Button label={t("inviteGenerate")} size="lg" fullWidth loading={loading} onClick={() => void generate()} />
      {code ? (
        <div className={styles.inline}>
          <span className={forms.label}>{t("inviteCode")}</span>
          <p className={styles.code} dir="ltr" role="status">{code}</p>
          <Button label={copied ? t("inviteCopied") : t("inviteCopy")} size="md" variant="outline" onClick={() => void copy()} />
          {copyFailed ? <p className={forms.error} role="alert">{t("inviteCopyFailed")}</p> : null}
        </div>
      ) : null}
      {failed ? <p className={forms.error} role="alert">{t("inviteFailed")}</p> : null}
    </section>
  );
}

/** Join: the invite code and the relation (POST /api/family/join, as before), then the family hub. */
export function JoinTab({ locale, initialCode }: { locale: string; initialCode?: string }) {
  const t = useTranslations("FamilyWeb");
  const router = useRouter();
  const [code, setCode] = useState(initialCode || "");
  const [relation, setRelation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (code.trim().length < 3) { setError(t("joinInvalid")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/family/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invite_code: code.trim(), relation: relation.trim() }),
      });
      if (!res.ok) { setError(t("joinFailed")); return; }
      router.push(`/${locale}/family`);
      router.refresh();
    } catch {
      setError(t("joinFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${rx.card} ${forms.stack}`} noValidate aria-label={t("tabJoin")}>
      <label className={forms.field}>
        <span className={forms.label}>{t("inviteCode")}</span>
        <input className={forms.control} value={code} onChange={(event) => setCode(event.target.value)} required minLength={3} maxLength={64} dir="ltr" placeholder={t("joinCodeHint")} autoComplete="off" />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("joinRelation")}</span>
        <input className={forms.control} value={relation} onChange={(event) => setRelation(event.target.value)} maxLength={64} placeholder={t("joinRelationHint")} />
      </label>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("joinSubmit")} size="lg" fullWidth loading={saving} />
    </form>
  );
}

/**
 * Scan: the web page has no camera, so the invite's code or its link is pasted and the join tab opens with the code filled
 * in (the code is taken from `?code=` / `?invite_code=` or the last path segment of a link, as before).
 */
export function ScanTab({ locale }: { locale: string }) {
  const t = useTranslations("FamilyWeb");
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    let extracted = trimmed;
    try {
      if (trimmed.includes("://") || trimmed.includes("?code=")) {
        const url = new URL(trimmed);
        const query = url.searchParams.get("code") || url.searchParams.get("invite_code") || "";
        if (query) extracted = query;
        else {
          const segment = url.pathname.split("/").filter(Boolean).pop();
          if (segment && segment.length >= 6) extracted = segment;
        }
      }
    } catch { /* a raw code */ }
    extracted = extracted.trim();
    if (!extracted) { setError(t("scanEmpty")); return; }
    setError(null);
    router.push(`/${locale}/family/add?tab=join&code=${encodeURIComponent(extracted)}`);
  }

  return (
    <form onSubmit={submit} className={`${rx.card} ${forms.stack}`} noValidate aria-label={t("tabScan")}>
      <p className={rx.lead}>{t("scanLead")}</p>
      <label className={forms.field}>
        <span className={forms.label}>{t("scanField")}</span>
        <input className={forms.control} value={value} onChange={(event) => setValue(event.target.value)} autoComplete="off" dir="ltr" placeholder={t("scanHint")} />
      </label>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("scanContinue")} size="lg" fullWidth />
    </form>
  );
}
