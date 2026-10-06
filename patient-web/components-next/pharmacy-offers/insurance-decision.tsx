import { getTranslations } from "next-intl/server";
import type { PatientPharmacyOrderProgress } from "@/lib/api/pharmacy-offers";
import type { Locale } from "@/lib/i18n";
import { formatMoney, pickName } from "./format";
import { InsuranceDecisionActions, RejectedInsuranceCancel } from "./payment-actions";
import styles from "./offers.module.css";

/**
 * The insurer's decision for each item, in the server's amounts, and the patient's explicit choices. The choices follow
 * the backend's own rules: a share can be accepted only after a PARTIAL approval with a share above zero; paying the full
 * price is open after a partial or a rejected decision; a rejected order can also be cancelled.
 */
export async function InsuranceDecision({ locale, orderId, progress }: { locale: Locale; orderId: string; progress: PatientPharmacyOrderProgress }) {
  const t = await getTranslations({ locale, namespace: "PharmacyOffers" });
  const insurance = progress.insurance;
  if (!insurance) return null;
  const names = new Map((progress.items ?? []).map((item) => [item.id, pickName(locale, { ar: item.nameAr, en: item.nameEn, raw: item.rawName })]));
  const decisionLabel = (value?: string) => (value === "APPROVED_FULL" || value === "APPROVED_PARTIAL" || value === "REJECTED" ? t(`decision.${value}`) : null);
  const canCoPay = insurance.decision === "APPROVED_PARTIAL" && Number(insurance.coPayAmount) > 0;
  const canSelfPay = insurance.decision === "APPROVED_PARTIAL" || insurance.decision === "REJECTED";
  return (
    <section className={styles.panel} aria-labelledby="insurance-title">
      <h2 className={styles.panelTitle} id="insurance-title">{t("insuranceDecisionTitle")}</h2>
      {insurance.decision && decisionLabel(insurance.decision) ? <p className={styles.note}><strong>{decisionLabel(insurance.decision)}</strong></p> : null}
      <ul className={styles.insuranceRows}>
        {insurance.items.map((item) => (
          <li key={item.id} className={styles.insuranceRow}>
            <span className={styles.insuranceName} dir="auto">{names.get(item.id) ?? t("pharmacyFallback")}</span>
            {decisionLabel(item.decision) ? <span className={styles.meta}>{decisionLabel(item.decision)}</span> : null}
            <dl className={styles.sums}>
              {item.coveredAmount !== undefined ? <div className={styles.sum}><dt>{t("coveredLabel")}</dt><dd>{formatMoney(locale, item.coveredAmount)}</dd></div> : null}
              {item.coPayAmount !== undefined ? <div className={styles.sum}><dt>{t("coPayLabel")}</dt><dd>{formatMoney(locale, item.coPayAmount)}</dd></div> : null}
            </dl>
            {item.reason ? <span className={styles.note} dir="auto">{t("reasonLabel")}: {item.reason}</span> : null}
          </li>
        ))}
      </ul>
      {insurance.coPayAmount !== undefined ? (
        <dl className={styles.sums}>
          <div className={`${styles.sum} ${styles.sumTotal}`}><dt>{t("coPayLabel")}</dt><dd>{formatMoney(locale, insurance.coPayAmount)}</dd></div>
        </dl>
      ) : null}
      <InsuranceDecisionActions orderId={orderId} canCoPay={canCoPay} canSelfPay={canSelfPay} />
      {insurance.decision === "REJECTED" ? <RejectedInsuranceCancel orderId={orderId} /> : null}
    </section>
  );
}
