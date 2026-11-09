"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";

/**
 * The refund policy before payment, with the "I agree" tick the backend requires (`refund_policy_accepted`, see lib/refund-policy.ts).
 * `lines` are the figures of the policy the page already has (the consultation's cancellation policy); without them the card says the
 * rules depend on the service and links to the full policy. The caller keeps the pay or confirm button off until `checked`.
 */
export function RefundPolicyTick({ locale, checked, onChange, lines, compact = false }: { locale: string; checked: boolean; onChange: (checked: boolean) => void; lines?: string[]; /** The page already shows the policy's figures above: only the link and the tick. */ compact?: boolean }) {
  const t = useTranslations("RefundPolicy");
  return (
    <section className={rx.card} aria-labelledby="refund-policy-title" data-testid="refund-policy-tick">
      <h2 id="refund-policy-title" className={forms.sectionTitle}>{t("title")}</h2>
      {compact ? null : lines && lines.length > 0 ? (
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
