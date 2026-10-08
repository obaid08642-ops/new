"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { TextField } from "@/components-next/care/care-fields";
import { Notice } from "@/components-next/consult/consult-parts";
import styles from "./loyalty.module.css";

/**
 * The three actions of the loyalty hub, each the same POST as before through the BFF (with its idempotency key): redeem a reward
 * (after a confirm), join a challenge, apply a friend's code. The page re-reads its server data after a success. The coupon
 * code shown is the one the server answered; none is made up.
 */

export function RedeemReward({ rewardId, title, cost, disabled }: { rewardId: string; title: string; cost: string; disabled: boolean }) {
  const t = useTranslations("LoyaltyHubWeb");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  async function redeem() {
    if (busy || disabled) return;
    if (!window.confirm(t("confirmRedeem", { cost, title }))) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/patient/loyalty/rewards/${encodeURIComponent(rewardId)}/claim`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: "{}",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("claim_failed");
      const data = (await res.json().catch(() => null)) as { coupon_code?: unknown } | null;
      const code = typeof data?.coupon_code === "string" && data.coupon_code ? data.coupon_code : null;
      setMessage({ tone: "ok", text: code ? t("redeemedCode", { code }) : t("redeemed") });
      router.refresh();
    } catch {
      setMessage({ tone: "bad", text: t("redeemFailed") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={styles.pad}>
      <Button label={disabled ? t("notEnough") : t("redeem")} size="sm" variant={disabled ? "outline" : "primary"} disabled={disabled} loading={busy} onClick={redeem} />
      {message ? <span role={message.tone === "bad" ? "alert" : "status"}><Notice warn={message.tone === "bad"}>{message.text}</Notice></span> : null}
    </span>
  );
}

export function JoinChallenge({ challengeId }: { challengeId: string }) {
  const t = useTranslations("LoyaltyHubWeb");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function join() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/patient/loyalty/challenges/${encodeURIComponent(challengeId)}/join`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-challenge-${challengeId}-${crypto.randomUUID()}` },
        body: "{}",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("join_failed");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={styles.pad}>
      <Button label={t("join")} size="sm" loading={busy} onClick={join} />
      {error ? <span role="alert"><Notice warn>{t("joinFailed")}</Notice></span> : null}
    </span>
  );
}

export function InvitePanel({ code }: { code: string }) {
  const t = useTranslations("LoyaltyHubWeb");
  const [friendCode, setFriendCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setMessage({ tone: "ok", text: t("copied") });
    } catch {
      setMessage({ tone: "bad", text: t("copyFailed") });
    }
  }

  async function share() {
    if (!code) return;
    const text = t("shareMessage", { code });
    const canShare = typeof navigator.share === "function";
    try {
      if (canShare) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setMessage({ tone: "ok", text: canShare ? t("shared") : t("copied") });
    } catch {
      /* the share sheet was dismissed */
    }
  }

  async function apply() {
    const value = friendCode.trim();
    if (!value || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/patient/referrals/apply", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-referral-${crypto.randomUUID()}` },
        body: JSON.stringify({ code: value }),
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("apply_failed");
      setFriendCode("");
      setMessage({ tone: "ok", text: t("applied") });
    } catch {
      setMessage({ tone: "bad", text: t("applyFailed") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.pad}>
        <p className={styles.fieldHint}>{t("yourCode")}</p>
        <p className={styles.code} dir="ltr" data-testid="loyalty-code">{code || "—"}</p>
        <div className={styles.pillRow}>
          <Button label={t("copyCode")} variant="outline" disabled={!code} onClick={copy} />
          <Button label={t("shareCode")} disabled={!code} onClick={share} />
        </div>
      </div>
      <form className={styles.pad} onSubmit={(event) => { event.preventDefault(); void apply(); }}>
        <TextField label={t("haveCode")} value={friendCode} onChange={setFriendCode} placeholder={t("codePlaceholder")} maxLength={32} />
        <p className={styles.fieldHint}>{t("applyHint")}</p>
        <Button label={t("applyCode")} variant="outline" loading={busy} disabled={!friendCode.trim()} onClick={apply} />
      </form>
      {message ? <span role={message.tone === "bad" ? "alert" : "status"}><Notice warn={message.tone === "bad"}>{message.text}</Notice></span> : null}
    </>
  );
}
