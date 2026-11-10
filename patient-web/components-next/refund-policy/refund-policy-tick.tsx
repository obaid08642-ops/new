"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { readRefundSummary, refundSummaryPath, type RefundLine, type RefundService } from "@/lib/refund-policy";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";

/**
 * The refund policy before payment, with the "I agree" tick the backend requires (`refund_policy_accepted`, see lib/refund-policy.ts).
 * `service` picks the text: the server sends the lines of that service's policy (GET /refund-policy/summary, keys + numbers) and they are shown in the
 * patient's language; while they load, or if they cannot be read, the card says the rules depend on the service and links to the full policy.
 * `lines` are the figures of the policy the page already has (the consultation's cancellation policy); without them the card says the
 * rules depend on the service and links to the full policy. The caller keeps the pay or confirm button off until `checked`.
 */
export function RefundPolicyTick({ locale, service, checked, onChange, lines, compact = false }: { locale: string; service?: RefundService; checked: boolean; onChange: (checked: boolean) => void; lines?: string[]; /** The page already shows the policy's figures above: only the link and the tick. */ compact?: boolean }) {
  const t = useTranslations("RefundPolicy");
  const [summary, setSummary] = useState<RefundLine[]>([]);
  useEffect(() => {
    if (!service || compact) return undefined;
    let live = true;
    fetch(`/api/patient${refundSummaryPath(service)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((answer) => { if (live) setSummary(readRefundSummary(answer)); })
      .catch(() => { if (live) setSummary([]); });
    return () => { live = false; };
  }, [service, compact]);
  return (
    <section className={rx.card} aria-labelledby="refund-policy-title" data-testid="refund-policy-tick">
      <h2 id="refund-policy-title" className={forms.sectionTitle}>{t("title")}</h2>
      {compact ? null : summary.length > 0 ? (
        <ul data-testid="refund-policy-lines">{summary.map((line) => <li key={line.key}>{t(`policy_${line.key}`, line.params)}</li>)}</ul>
      ) : lines && lines.length > 0 ? (
        <ul>{lines.map((line) => <li key={line}>{line}</li>)}</ul>
      ) : (
        <p className={rx.note}>{t("general")}</p>
      )}
      <Link className={rx.textLink} href={`/${locale}/refund-policy`}>{t("read")}</Link>
      <label className={forms.field}>
        <span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /> {t("agree")}</span>
      </label>
      {!checked ? <p className={rx.note} role="status">{t("needAgree")}</p> : null}
    </section>
  );
}
