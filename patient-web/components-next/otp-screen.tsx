"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { authErrorKind } from "@/lib/auth/auth-errors";
import { announceSignedIn } from "@/lib/auth/session-identity";
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

const BLANK_CELLS = ["", "", "", "", "", ""];

/** The text with Eastern Arabic-Indic and Persian digits written as Latin digits. */
function latinDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function asciiDigits(text: string): string {
  return latinDigits(text).replace(/\D/g, "");
}

function setCell(current: string[], index: number, digit: string): string[] {
  const copy = [...current];
  copy[index] = digit;
  return copy;
}

/** The six cells with `digits` written from cell `index` on. */
export function fillFrom(current: string[], index: number, digits: string): string[] {
  const copy = [...current];
  for (let offset = 0; offset < digits.length && index + offset < copy.length; offset += 1) {
    copy[index + offset] = digits[offset];
  }
  return copy;
}

/**
 * The cells after a paste. The code is the last six-digit run in the text (a message such as "Order 182045 ... code
 * 482913" pastes its code); without one, the first six digits. A paste of the code fills all six cells.
 */
export function pasteCells(current: string[], index: number, text: string): string[] {
  const runs = [...latinDigits(text).matchAll(/(?<!\d)\d{6}(?!\d)/g)];
  const code = runs.length ? runs[runs.length - 1][0] : asciiDigits(text).slice(0, 6);
  if (code.length === 6) return fillFrom(BLANK_CELLS, 0, code);
  return fillFrom(current, index, code);
}

/**
 * The cells after a change in cell `index`. One digit replaces the cell. Several digits come from an autofill (six or
 * more: the code fills all six cells) or from a keyboard that sends the whole field value: the digit typed is the one
 * the cell did not hold, whatever the caret position.
 */
export function cellsAfterChange(current: string[], index: number, value: string): string[] {
  const digits = asciiDigits(value);
  if (digits.length >= 6) return fillFrom(BLANK_CELLS, 0, digits.slice(-6));
  if (digits.length <= 1) return setCell(current, index, digits);
  const held = current[index];
  const typed = !held ? digits : digits.startsWith(held) ? digits.slice(1) : digits.endsWith(held) ? digits.slice(0, -1) : digits;
  return setCell(current, index, typed.slice(-1));
}

/** The page reads where the code went from a server-set cookie (never from the URL) and hands it down. */
export function OtpScreen({ locale, identifier = "", codeNotSent = false }: { locale: Locale; identifier?: string; codeNotSent?: boolean }) {
  const t = useTranslations("Otp");
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  // The account was created but the first code was not sent: resend is open at once and the page says why.
  const [seconds, setSeconds] = useState(codeNotSent ? 0 : 300);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(identifier ? null : t("missing"));
  const [notice, setNotice] = useState<string | null>(codeNotSent && identifier ? t("notSent") : null);
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

  // After one digit the focus moves on; after a fill it goes to the first empty cell from the edited one on.
  function focusAfter(cells: string[], index: number, filled: boolean) {
    if (!filled) { refs.current[Math.min(index + 1, 5)]?.focus(); return; }
    const open = cells.findIndex((digit, cell) => cell >= index && !digit);
    refs.current[open === -1 ? 5 : open]?.focus();
  }

  function keyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) refs.current[index - 1]?.focus();
    // A digit replaces the cell whatever the caret position.
    if (/^[0-9٠-٩۰-۹]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const next = cellsAfterChange(digits, index, event.key);
      setDigits(next);
      focusAfter(next, index, false);
    }
  }

  function update(index: number, value: string) {
    const typed = asciiDigits(value);
    const next = cellsAfterChange(digits, index, value);
    if (next.join("") !== digits.join("")) setDigits(next);
    if (typed) focusAfter(next, index, typed.length > 1);
  }

  // A paste or a dropped text fills the code from the cell it lands in; returns whether it held digits.
  function applyText(index: number, text: string): boolean {
    if (!asciiDigits(text)) return false;
    const next = pasteCells(digits, index, text);
    setDigits(next);
    focusAfter(next, index, true);
    return true;
  }

  function paste(event: React.ClipboardEvent<HTMLInputElement>, index: number) {
    if (applyText(index, event.clipboardData.getData("text"))) event.preventDefault();
  }

  function drop(event: React.DragEvent<HTMLInputElement>, index: number) {
    if (applyText(index, event.dataTransfer.getData("text"))) event.preventDefault();
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
      announceSignedIn();
      router.replace(`/${locale}/dashboard`); router.refresh();
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
        <div className={styles.cells} dir="ltr">{digits.map((digit, index) => <input key={index} ref={(el) => { refs.current[index] = el; }} className={styles.cell} value={digit} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} aria-label={`${t("code")} ${index + 1}`} onChange={(event) => update(index, event.target.value)} onPaste={(event) => paste(event, index)} onDrop={(event) => drop(event, index)} onKeyDown={(event) => keyDown(index, event)} />)}</div>
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
