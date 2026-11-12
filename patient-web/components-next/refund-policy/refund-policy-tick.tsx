"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { POLICY_CHANGED_EVENT, readRefundSummary, readRefundSummaryHash, refundSummaryPath, rememberShownPolicy, type RefundLine, type RefundService } from "@/lib/refund-policy";
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
  const [changed, setChanged] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!service) return undefined;
    if (compact) { rememberShownPolicy(service, undefined); return undefined; }
    let live = true;
    fetch(`/api/patient${refundSummaryPath(service)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((answer) => {
        if (!live) return;
        const lines = readRefundSummary(answer);
        setSummary(lines);
        // the hash is remembered only when the text it belongs to is really on the screen
        rememberShownPolicy(service, lines.length > 0 ? readRefundSummaryHash(answer) : undefined);
      })
      .catch(() => { if (live) { setSummary([]); rememberShownPolicy(service, undefined); } });
    return () => { live = false; };
  }, [service, compact, reload]);
  // a create answered 409 refund_policy_changed: show the new text and ask for the tick again
  useEffect(() => {
    if (!service) return undefined;
    const onChanged = (event: Event) => {
      if ((event as CustomEvent<{ service?: string }>).detail?.service !== service) return;
      setChanged(true); onChange(false); setReload((n) => n + 1);
    };
    window.addEventListener(POLICY_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(POLICY_CHANGED_EVENT, onChanged);
  }, [service, onChange]);
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
      {changed ? <p className={rx.note} role="alert" data-testid="refund-policy-changed">{t("changed")}</p> : null}
      {!checked ? <p className={rx.note} role="status">{t("needAgree")}</p> : null}
    </section>
  );
}
