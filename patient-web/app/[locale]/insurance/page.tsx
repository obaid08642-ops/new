import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientInsuranceBenefits, getPatientInsurancePolicy } from "@/lib/api/insurance-server";
import { parseInsuranceSummary, type InsuranceSummary } from "@/lib/api/insurance";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { formatDate } from "@/lib/format-date";
import { parseBenefits, parseProviders, parseRequestRows, isRequestState, requestTone, tabOf, type InsuranceTab } from "@/lib/insurance/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice } from "@/components-next/consult/consult-parts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { InsuranceRow, InsuranceTabs, PolicyCard, RowsList, ShortcutGrid, StatusBadge } from "@/components-next/insurance/insurance-kit";
import forms from "@/components-next/consult/consult.module.css";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/insurance/insurance.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string; q?: string; type?: string }> };

/** One GET that may fail or throw: the part says so in place and the rest of the page still works. */
async function read(call: () => Promise<Response>): Promise<{ status: number; body: unknown } | null> {
  try {
    const response = await call();
    return { status: response.status, body: response.ok ? await response.json().catch(() => null) : null };
  } catch {
    return null;
  }
}

/**
 * The insurance hub (canvas/Insurance; merge map 2, section 6): the policy card, the three shortcuts and the tabs Policy,
 * Benefits and Network (`?tab=`). It is view only (owner decision 35, 2026-10-10: the facility asks the insurer, Nabd+ shows the
 * decision). It replaces the old overview, policy detail, benefits and network pages, which redirect here; the removed claims, refunds
 * and submit-claim pages redirect here too. Every value is the server's; a tab whose data cannot load says so in place.
 */
export default async function InsurancePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("InsuranceWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const tab: InsuranceTab = tabOf(sp.tab);
  const base = `/${locale}/insurance`;

  const policyRes = await read(() => getPatientInsurancePolicy(token));
  if (policyRes?.status === 401) redirect(`/${locale}/login`);
  if (policyRes?.status === 403 || policyRes?.status === 404) notFound();
  const summary: InsuranceSummary | null = policyRes ? parseInsuranceSummary(policyRes.body) : null;
  if (!summary) {
    return (
      <ConsultPage locale={locale} title={t("title")}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }

  const unavailable = <div role="alert"><Notice warn>{t("partUnavailable")}</Notice></div>;
  const empty = (text: string) => <Notice>{text}</Notice>;
  let content: React.ReactNode = null;

  if (tab === "policy") {
    const requests = await read(() => callPatientApi("/insurance/requests/my", {}, token));
    if (requests?.status === 401) redirect(`/${locale}/login`);
    const rows = requests && requests.status >= 200 && requests.status < 300 ? parseRequestRows(requests.body) : null;
    content = (
      <>
        <div className={styles.toolbar}>
          <ButtonLink href={`${base}/add-policy`} label={summary.hasPolicy ? t("changePolicy") : t("addPolicy")} variant={summary.hasPolicy ? "outline" : "primary"} size="md" />
        </div>
        <h2 className={rx.h2}>{t("requestsTitle")}</h2>
        {rows === null ? unavailable : rows.length === 0 ? empty(t("requestsEmpty")) : (
          <RowsList label={t("requestsTitle")}>
            {rows.map((row) => (
              <InsuranceRow
                key={row.id}
                locale={locale}
                href={`${base}/requests/${row.id}`}
                title={t("requestTitle")}
                sub={formatDate(locale, row.createdAt) ?? undefined}
                badge={row.state ? <StatusBadge tone={requestTone(row.state)}>{isRequestState(row.state) ? t(`requestState.${row.state}`) : t("requestState.unknown")}</StatusBadge> : undefined}
              />
            ))}
          </RowsList>
        )}
        <p className={styles.note}>{t("disclaimer")}</p>
      </>
    );
  } else if (tab === "benefits") {
    const res = await read(() => getPatientInsuranceBenefits(token));
    const benefits = res && res.status >= 200 && res.status < 300 ? parseBenefits(res.body) : null;
    content = benefits === null ? unavailable : benefits.length === 0 ? empty(t("benefitsEmpty")) : (
      <RowsList label={t("tabBenefits")}>
        {benefits.map((row) => <InsuranceRow key={row.key} locale={locale} title={t("benefitTitle")} sub={row.note} />)}
      </RowsList>
    );
  } else {
    // Network: the providers of the insurer on the profile (as the old page did); without a saved policy there is nothing to list.
    const profile = await read(() => callPatientApi("/users/me/profile", {}, token));
    if (profile?.status === 401) redirect(`/${locale}/login`);
    const insurance = (profile?.body as { insurance?: { company_id?: string } } | null)?.insurance;
    const companyId = insurance?.company_id || "";
    const q = (sp.q || "").trim();
    let providers: ReturnType<typeof parseProviders> | null = [];
    if (companyId) {
      const qs = new URLSearchParams({ insurance_company: companyId });
      if (sp.type && sp.type !== "all") qs.set("type", sp.type);
      if (q) qs.set("q", q);
      const res = await read(() => callPatientApi(`/providers?${qs.toString()}`, {}, token));
      if (res?.status === 401) redirect(`/${locale}/login`);
      providers = res && res.status >= 200 && res.status < 300 ? parseProviders(res.body) : null;
    }
    content = !companyId ? (
      <>
        {empty(t("networkNoPolicy"))}
        <ButtonLink href={`${base}/add-policy`} label={t("addPolicy")} />
      </>
    ) : (
      <>
        <form method="get" action={base} className={styles.search} role="search" aria-label={t("tabNetwork")}>
          <input type="hidden" name="tab" value="network" />
          <label className={`${forms.field} ${styles.searchField}`}>
            <span className={forms.label}>{t("networkSearch")}</span>
            <input className={forms.control} name="q" defaultValue={q} maxLength={80} />
          </label>
          <button type="submit" className="nabd-button nabd-button--primary nabd-button--lg"><span className="nabd-button__label">{t("search")}</span></button>
        </form>
        {providers === null ? unavailable : providers.length === 0 ? empty(t("networkEmpty")) : (
          <RowsList label={t("tabNetwork")}>
            {providers.map((provider) => <InsuranceRow key={provider.id} locale={locale} title={provider.name} sub={provider.type} />)}
          </RowsList>
        )}
      </>
    );
  }

  return (
    <ConsultPage locale={locale} title={t("title")}>
      <PolicyCard
        title={summary.companyName ?? t("noPolicyTitle")}
        sub={summary.planClass ? t("planLine", { plan: summary.planClass }) : undefined}
        badge={summary.hasPolicy ? t("active") : t("none")}
        tone={summary.hasPolicy ? "good" : "plain"}
      />
      <ShortcutGrid
        label={t("shortcuts")}
        items={[
          { href: `${base}/add-policy`, label: t("addPolicy"), icon: "plus", tone: "blue" },
          { href: `${base}?tab=network`, label: t("tabNetwork"), icon: "hospital", tone: "coral" },
          { href: `${base}/coverage-check`, label: t("coverageCheck"), icon: "shield-check", tone: "mint" },
        ]}
      />
      <InsuranceTabs
        label={t("tabs")}
        base={base}
        active={tab}
        options={[
          { value: "policy", label: t("tabPolicy") },
          { value: "benefits", label: t("tabBenefits") },
          { value: "network", label: t("tabNetwork") },
        ]}
      />
      {content}
    </ConsultPage>
  );
}
