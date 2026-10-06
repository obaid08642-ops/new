"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { authErrorKind } from "@/lib/auth/auth-errors";
import { resetSessionIdentity } from "@/lib/auth/session-identity";
import type { Locale } from "@/lib/i18n";
import styles from "./auth/auth.module.css";

type Translate = (key: string) => string;

/** Why a code did not verify: wrong code, expired, locked after too many tries, or anything else. */
export function verifyErrorMessage(t: Translate, status: number): string {
  switch (authErrorKind(status)) {
    case "unauthorized": return t("wrong");
    case "gone": return t("expired");
    case "rateLimited": return t("locked");
    default: return t("failed");
  }
}

/** Why a new code was not sent. */
export function resendErrorMessage(t: Translate, status: number): string {
  switch (authErrorKind(status)) {
    case "rateLimited": return t("resendLimited");
    case "unavailable": return t("resendUnavailable");
    default: return t("resendFailed");
  }
}

/** The page reads where the code went from a server-set cookie (never from the URL) and hands it down. */
export function OtpScreen({ locale, identifier = "" }: { locale: Locale; identifier?: string }) {
  const t = useTranslations("Otp");
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(300);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(identifier ? null : t("missing"));
  const [notice, setNotice] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  // Latin digits through the locale formatter, to match the digits typed into the code cells.
  const plain = { useGrouping: false, numberingSystem: "latn" } as const;
  const minutesFormat = new Intl.NumberFormat(locale, plain);
  const secondsFormat = new Intl.NumberFormat(locale, { ...plain, minimumIntegerDigits: 2 });

  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  function update(index: number, value: string) {
    const next = value.replace(/\D/g, "").slice(-1);
    const copy = [...digits];
    copy[index] = next;
    setDigits(copy);
    if (next && index < 5) refs.current[index + 1]?.focus();
  }

  function keyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) refs.current[index - 1]?.focus();
  }

  async function resend() {
    if (!identifier || seconds > 0 || busy) return;
    setError(null); setNotice(null);
    try {
      const response = await fetch("/api/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier }) });
      if (response.ok) { setSeconds(300); setNotice(t("resent")); return; }
      setError(resendErrorMessage(t, response.status));
    } catch { setError(t("resendUnavailable")); }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    const code = digits.join("");
    if (!identifier || code.length !== 6) { setError(t("invalid")); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      const verified = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, code }) });
      if (!verified.ok) { setError(verifyErrorMessage(t, verified.status)); return; }
      const exchanged = await fetch("/api/auth/session/exchange", { method: "POST" });
      if (!exchanged.ok) { setError(t("failed")); return; }
      resetSessionIdentity(); router.replace(`/${locale}/dashboard`); router.refresh();
    } catch { setError(t("failed")); }
    finally { setBusy(false); }
  }

  const minutes = minutesFormat.format(Math.floor(seconds / 60));
  const rest = secondsFormat.format(seconds % 60);
  return <>
    <div className={styles.heading}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{identifier ? t.rich("body", { identifier, id: (chunks) => <bdi dir="ltr">{chunks}</bdi> }) : t("missing")}</p>
    </div>
    <form className={styles.form} onSubmit={verify}>
      <fieldset className={styles.otp} disabled={!identifier || busy}>
        <legend className={styles.srOnly}>{t("code")}</legend>
        <div className={styles.cells} dir="ltr">{digits.map((digit, index) => <input key={index} ref={(el) => { refs.current[index] = el; }} className={styles.cell} value={digit} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={1} aria-label={`${t("code")} ${index + 1}`} onChange={(event) => update(index, event.target.value)} onKeyDown={(event) => keyDown(index, event)} />)}</div>
      </fieldset>
      <div className={styles.resendRow}>
        {seconds > 0 ? <><span className={styles.hint}>{t("wait")}</span><span className={styles.timer} dir="ltr">{minutes}:{rest}</span></> : <button type="button" className={styles.link} onClick={resend} disabled={!identifier || busy}>{t("resend")}</button>}
      </div>
      {notice ? <p className={styles.note} role="status">{notice}</p> : null}
      {error && identifier ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="lg" fullWidth label={busy ? t("busy") : t("verify")} loading={busy} disabled={!identifier} />
        <p className={styles.foot}><button type="button" className={styles.link} onClick={() => router.back()}>{t("back")}</button></p>
      </div>
    </form>
  </>;
}
