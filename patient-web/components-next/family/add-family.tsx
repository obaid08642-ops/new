"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { Spinner } from "@/components-next/ui-generated/components/Spinner";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";
import styles from "./family.module.css";

const FAMILY = SERVICE_ICONS.family;
import { copyText } from "@/lib/copy-text";
import { CameraScanner, QR_FORMATS } from "@/components-next/scan/camera-scanner";

/**
 * Invite: the code is created as soon as the tab opens (POST /api/family/invite, as the app does), with a retry when it fails;
 * it is shown with Copy and Share (the browser's share sheet where there is one, else the message is copied) and a note on
 * what the owner controls once the invite is accepted. (The app also draws a QR of the invite; the web has no QR library.)
 */
export function InviteTab() {
  const t = useTranslations("FamilyWeb");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const started = useRef(false);

  const generate = useCallback(async () => {
    setFailed(false);
    setLoading(true);
    setCopied(false);
    setCopyFailed(false);
    try {
      const res = await fetch("/api/family/invite", { method: "POST" });
      const data = await res.json().catch(() => null);
      const next = String((data as { invite_code?: string } | null)?.invite_code || "");
      if (!res.ok || !next) { setFailed(true); return; }
      setCode(next);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void generate();
  }, [generate]);

  async function copy(text: string) {
    const ok = await copyText(text);
    setCopyFailed(!ok);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    if (!code) return;
    const message = t("inviteShareMessage", { code });
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try { await navigator.share({ text: message }); return; } catch (error) { if ((error as { name?: string } | null)?.name === "AbortError") return; }
    }
    await copy(message);
  }

  return (
    <section className={rx.card} aria-label={t("tabInvite")} aria-busy={loading}>
      <p className={rx.lead}>{t("inviteLead")}</p>
      {loading ? <Spinner label={t("creating")} /> : null}
      {code ? (
        <div className={styles.inline}>
          <span className={forms.label}>{t("inviteCode")}</span>
          <p className={styles.code} dir="ltr" role="status">{code}</p>
          <div className={styles.actionsRow}>
            <Button label={copied ? t("inviteCopied") : t("inviteCopy")} size="md" variant="outline" onClick={() => void copy(code)} />
            <Button label={t("inviteShare")} size="md" onClick={() => void share()} />
          </div>
          {copyFailed ? <p className={forms.error} role="alert">{t("inviteCopyFailed")}</p> : null}
        </div>
      ) : null}
      {failed ? (
        <>
          <p className={forms.error} role="alert">{t("inviteFailed")}</p>
          <Button label={t("inviteGenerate")} size="md" variant="outline" onClick={() => void generate()} />
        </>
      ) : null}
      <div className={styles.inline}>
        <span className={forms.label}>{t("invitePermsTitle")}</span>
        <p className={rx.note}>{t("invitePermsBody")}</p>
      </div>
    </section>
  );
}

const JOIN_ERRORS = ["invalid_invite_code", "invite_expired", "already_member"] as const;
const RELATIONS = ["spouse", "child", "parent", "sibling", "caregiver", "other"] as const;

/**
 * Join: the invite code (upper-cased as typed) and the relation chosen from the app's list (POST /api/family/join; the relation is
 * stored in Arabic, as the app sends it, so the page passes the Arabic words), then a "joined" state with a button to the hub.
 */
export function JoinTab({ locale, initialCode, relationValues }: { locale: string; initialCode?: string; relationValues: Record<string, string> }) {
  const t = useTranslations("FamilyWeb");
  const router = useRouter();
  const [code, setCode] = useState((initialCode || "").toUpperCase());
  const [relation, setRelation] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [joined, setJoined] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (code.trim().length < 3) { setError(t("joinInvalid")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/family/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invite_code: code.trim(), relation: relation ? relationValues[relation] ?? "" : "" }),
      });
      if (!res.ok) {
        // The backend answers a code for the causes the patient can act on; anything else stays the generic line.
        const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
        const cause = JOIN_ERRORS.find((known) => known === body?.message);
        setError(cause ? t(`joinError.${cause}`) : t("joinFailed"));
        return;
      }
      setJoined(true);
      router.refresh();
    } catch {
      setError(t("joinFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (joined) {
    return (
      <section className={`${rx.card} ${forms.stack}`} aria-label={t("tabJoin")}>
        <EmptyState icon={FAMILY.icon} tone={FAMILY.tone} title={t("joinDoneTitle")} body={t("joinDoneBody")} />
        <ButtonLink href={`/${locale}/family`} label={t("joinGoFamily")} fullWidth />
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`${rx.card} ${forms.stack}`} noValidate aria-label={t("tabJoin")}>
      <label className={forms.field}>
        <span className={forms.label}>{t("inviteCode")}</span>
        <input className={forms.control} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required minLength={3} maxLength={64} dir="ltr" placeholder={t("joinCodeHint")} autoComplete="off" autoCapitalize="characters" />
      </label>
      <div className={forms.field} role="group" aria-label={t("joinRelation")}>
        <span className={forms.label}>{t("joinRelation")}</span>
        <div className={forms.choices}>
          {RELATIONS.map((key) => (
            <button key={key} type="button" className={forms.choice} aria-pressed={relation === key} onClick={() => setRelation(relation === key ? "" : key)}>{t(`relation.${key}`)}</button>
          ))}
        </div>
      </div>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("joinSubmit")} size="lg" fullWidth loading={saving} disabled={!code.trim()} />
      <ButtonLink href={`/${locale}/family/add?tab=scan`} label={t("joinScan")} variant="outline" fullWidth />
    </form>
  );
}

/**
 * Scan (issue 694): the camera reads the invite's QR code where the browser can (CameraScanner), or the code or its link is
 * pasted; the join tab opens with the code filled in (the code is taken from `?code=` / `?invite_code=` or the last path
 * segment of a link, as before).
 */
export function ScanTab({ locale }: { locale: string }) {
  const t = useTranslations("FamilyWeb");
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    go(value);
  }

  function go(raw: string) {
    const trimmed = raw.trim();
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
      <CameraScanner formats={QR_FORMATS} onResult={(scanned) => { setValue(scanned); go(scanned); }} />
      <label className={forms.field}>
        <span className={forms.label}>{t("scanField")}</span>
        <input className={forms.control} value={value} onChange={(event) => setValue(event.target.value)} autoComplete="off" dir="ltr" placeholder={t("scanHint")} />
      </label>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("scanContinue")} size="lg" fullWidth />
    </form>
  );
}
