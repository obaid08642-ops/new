import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { extractRecord } from "@/lib/api/profile";
import { readCancellationPolicy } from "@/lib/consult/cancellation-policy";
import { policyLines } from "@/components-next/consult/policy-lines";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { BulletList, Hero, SectionCard } from "@/components-next/consult/consult-parts";
import { Group, NavRows } from "@/components-next/settings/settings-kit";
import forms from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }> };

const count = (record: Record<string, unknown> | null, key: string): number | undefined => {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
};

/**
 * `/settings/about` (merge map section 3): what the app is, the links to the legal pages (the public `/terms` and `/privacy`
 * stay as they are) and the cancellation and refund rules, written from the numbers the server publishes in
 * GET /system-config/public (decision 26). A number the server does not send is not written, and nothing here states hours
 * or days of its own.
 */
export default async function SettingsAboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("SettingsWeb");
  const c = await getTranslations("ConsultWeb");
  const response = await callPatientApi("/system-config/public");
  const config = response.ok ? extractRecord(await response.json().catch(() => null)) : null;
  const cancel = extractRecord({ data: config?.cancellation_policy ?? null });
  const returns = extractRecord({ data: config?.returns_policy ?? null });
  const fullHours = count(cancel, "full_hours");
  const refundMin = count(returns, "wallet_refund_days_min");
  const refundMax = count(returns, "wallet_refund_days_max");
  const unusedDays = count(returns, "unused_days");
  const rules: string[] = [];
  // issue 781: the same three tiers the booking and cancellation pages show, from the server's numbers (full refund, the
  // half tier with its percent, then none); the old "late fee" line is gone because the server applies the half tier instead
  const policy = readCancellationPolicy(config);
  if (policy) rules.push(...policyLines(c, policy));
  else if (fullHours !== undefined) rules.push(t("ruleCancelFull", { hours: fullHours }));
  if (refundMin !== undefined && refundMax !== undefined) rules.push(t("ruleRefundDays", { min: refundMin, max: refundMax }));
  if (unusedDays !== undefined) rules.push(t("ruleReturnDays", { days: unusedDays }));

  return (
    <ConsultPage locale={locale} title={t("aboutTitle")} backHref={`/${locale}/settings`}>
      <Hero icon="heartbeat" tone="coral" title={t("aboutName")} sub={t("aboutLead")} />
      <Group id="legal" title={t("aboutLegal")}>
        <NavRows
          locale={locale}
          label={t("aboutLegal")}
          rows={[
            { href: `/${locale}/terms`, icon: "file-text", tone: "ink", title: t("aboutTerms") },
            { href: `/${locale}/privacy`, icon: "shield-check", tone: "teal", title: t("aboutPrivacy") },
          ]}
        />
      </Group>
      <SectionCard id="rules" title={t("aboutRules")}>
        {rules.length > 0 ? <BulletList items={rules} label={t("aboutRules")} /> : <p className={`${forms.body} ${forms.muted}`}>{t("aboutRulesUnavailable")}</p>}
      </SectionCard>
    </ConsultPage>
  );
}
