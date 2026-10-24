import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientInsuranceBenefits, getPatientInsurancePolicy } from "@/lib/api/insurance-server";
import { parseInsuranceSummary, type InsuranceSummary } from "@/lib/api/insurance";
import { callPatientApi } from "@/lib/api/upstream";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { readPublicInsurers, readPublicNetworkProviders } from "@/lib/api/public-services-server";
import { parsePublicInsurers, parsePublicProviders, signInHref } from "@/lib/services/guest";
import { pickText } from "@/components-next/diagnostics/diag-parts";
import { CareHero } from "@/components-next/care/care-kit";
import { GuestAction, GuestList } from "@/components-next/guest/guest-service";
import { guestListLabels } from "@/components-next/guest/guest-labels";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { isLocale, type Locale } from "@/lib/i18n";
import { formatDate } from "@/lib/format-date";
import { formatPrice } from "@/lib/format-price";
import { parseBenefits, parseBenefitsUsage, parseProviders, parseRequestRows, isRequestState, requestKindOf, requestTone, tabOf, type InsuranceTab } from "@/lib/insurance/view";

/** GET /providers sends the provider type as a code (ProviderType); the page translates it, never shows it raw. */
const PROVIDER_TYPES = ["doctor", "pharmacy", "hospital", "clinic", "lab", "radiology", "home_care", "nursing"] as const;
const isProviderType = (value?: string): value is (typeof PROVIDER_TYPES)[number] => PROVIDER_TYPES.some((type) => type === value);
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice } from "@/components-next/consult/consult-parts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { InsuranceRow, InsuranceTabs, PolicyCard, RowsList, ShortcutGrid, StatusBadge } from "@/components-next/insurance/insurance-kit";
import { NetworkList } from "@/components-next/insurance/network-list";
import forms from "@/components-next/consult/consult.module.css";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/insurance/insurance.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string; q?: string; type?: string; company?: string }> };

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
  const token = await getOptionalPatientAccessToken();
  const tab: InsuranceTab = tabOf(sp.tab);
  const base = `/${locale}/insurance`;
  if (!token) return <GuestInsurance locale={locale} tab={tab} company={sp.company} type={sp.type} />;

  const policyRes = await read(() => getPatientInsurancePolicy(token));
  if (policyRes?.status === 401) redirect(signInHref(locale, base));
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
                title={t(`kind.${requestKindOf(row.bookingKind)}`)}
                sub={[row.price !== undefined ? formatPrice(locale, row.price).text : null, formatDate(locale, row.createdAt)].filter(Boolean).join(" · ") || undefined}
                badge={row.state ? <StatusBadge tone={requestTone(row.state)}>{isRequestState(row.state) ? t(`requestState.${row.state}`) : t("requestState.unknown")}</StatusBadge> : undefined}
              />
            ))}
          </RowsList>
        )}
      </>
    );
  } else if (tab === "benefits") {
    const res = await read(() => getPatientInsuranceBenefits(token));
    const ok = res !== null && res.status >= 200 && res.status < 300;
    const benefits = ok ? parseBenefits(res.body) : null;
    const usage = ok ? parseBenefitsUsage(res.body) : null;
    const money = (value?: number) => (value === undefined ? "—" : formatPrice(locale, value).text);
    const expiry = usage?.expiryDate ? formatDate(locale, usage.expiryDate) : null;
    content = benefits === null ? unavailable : benefits.length === 0 && !usage?.usage ? empty(t("benefitsEmpty")) : (
      <>
        {usage?.usage ? (
          <section className={rx.card} aria-label={t("tabBenefits")}>
            <p className={styles.policyName}>{t("usageRequests", { count: usage.usage.requests })}</p>
            <ul className={styles.amounts}>
              <li><span className={styles.amountLabel}>{t("usageCovered")}</span><span className={styles.amountValue}><bdi>{money(usage.usage.insurerCovered)}</bdi></span></li>
              <li><span className={styles.amountLabel}>{t("usagePaid")}</span><span className={styles.amountValue}><bdi>{money(usage.usage.patientShare)}</bdi></span></li>
            </ul>
            {expiry ? <p className={styles.note}>{t("expiryLine", { date: expiry })}</p> : null}
          </section>
        ) : null}
        {benefits.length > 0 ? (
          <RowsList label={t("tabBenefits")}>
            {benefits.map((row) => <InsuranceRow key={row.key} locale={locale} title={t("benefitTitle")} sub={row.noteCode ? t(`noteCode.${row.noteCode}`) : undefined} />)}
          </RowsList>
        ) : null}
      </>
    );
  } else {
    // Network: the providers of the insurer on the profile (as the old page did); without a saved policy there is nothing to list.
    const profile = await read(() => callPatientApi("/users/me/profile", {}, token));
    if (profile?.status === 401) redirect(`/${locale}/login`);
    const insurance = (profile?.body as { insurance?: { company_id?: string; network?: string; class?: string } } | null)?.insurance;
    const companyId = insurance?.company_id || "";
    let providers: ReturnType<typeof parseProviders> | null = [];
    if (companyId) {
      const qs = new URLSearchParams({ insurance_company: companyId });
      // The patient's network and class narrow the list the same way the app's network tab does.
      if (insurance?.network) qs.set("insurance_network", insurance.network);
      if (insurance?.class) qs.set("insurance_class", insurance.class);
      const res = await read(() => callPatientApi(`/providers?${qs.toString()}`, {}, token));
      if (res?.status === 401) redirect(`/${locale}/login`);
      providers = res && res.status >= 200 && res.status < 300 ? parseProviders(res.body, locale) : null;
    }
    content = !companyId ? (
      <>
        {empty(t("networkNoPolicy"))}
        <ButtonLink href={`${base}/add-policy`} label={t("addPolicy")} />
      </>
    ) : (
      providers === null ? unavailable : providers.length === 0 ? empty(t("networkEmpty")) : <NetworkList providers={providers} locale={locale} />
    );
  }

  return (
    <ConsultPage locale={locale} title={t("title")}>
      <PolicyCard
        title={summary.companyName ?? t("noPolicyTitle")}
        sub={summary.planClass ? t("planLine", { plan: summary.planClass }) : undefined}
        badge={!summary.hasPolicy ? t("none") : summary.verified ? t("policyVerified") : t("policyInReview")}
        tone={!summary.hasPolicy ? "plain" : summary.verified ? "good" : "wait"}
        logoUrl={summary.logoUrl}
        lines={[
          summary.memberId ? t("memberLine", { id: summary.memberId }) : null,
          summary.expiryDate && formatDate(locale, summary.expiryDate) ? t("expiryLine", { date: formatDate(locale, summary.expiryDate) as string }) : null,
        ].filter((line): line is string => !!line)}
        details={[
          { label: t("policyNumber"), value: summary.policyNumber },
          { label: t("memberName"), value: summary.memberName },
          { label: t("nationalId"), value: summary.nationalId ?? summary.memberId },
          { label: t("policyNetwork"), value: summary.network },
        ].filter((row): row is { label: string; value: string } => !!row.value)}
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
      <p className={styles.note}>{t("disclaimer")}</p>
    </ConsultPage>
  );
}

/**
 * Issue 1550: the insurance page of a guest. What the service is, the insurers and plans a policy can be added with (the public
 * GET /insurance/companies), and the one action, adding a policy, which opens the sign-in and comes back to the form. On the
 * network tab (`?tab=network`, where the old /insurance/network-providers lands) the guest picks an insurer and sees the published
 * providers that accept it (the public GET /providers?insurance_company=…). The patient's own policy, requests and network are
 * read only with a session.
 */
async function GuestInsurance({ locale, tab, company, type }: { locale: Locale; tab: InsuranceTab; company?: string; type?: string }) {
  const t = await getTranslations("InsuranceWeb");
  const g = await getTranslations("GuestServices");
  const read = await readPublicInsurers();
  const insurers = read.failed ? [] : parsePublicInsurers(read.body);
  const labels = await guestListLabels(g("insurance.insurersEmpty"));
  const shield = SERVICE_ICONS.insurance;
  const base = `/${locale}/insurance`;
  const network = tab === "network";
  // Only an insurer of the public list is read; anything else typed into the URL is ignored.
  const chosen = network ? insurers.find((insurer) => insurer.id === company?.trim()) : undefined;
  const networkType = type && isProviderType(type) ? type : undefined;
  const networkRead = chosen ? await readPublicNetworkProviders(chosen.id, networkType) : null;
  const providers = networkRead && !networkRead.failed ? parsePublicProviders(networkRead.body) : [];
  const networkLabels = await guestListLabels(t("networkEmpty"));
  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}`}>
      <CareHero tone={shield.tone} icon={shield.icon} label={t("title")} title={g("insurance.heroTitle")} lines={[g("insurance.heroBody")]} />
      {network ? (
        <section aria-labelledby="insurance-network">
          <h2 id="insurance-network" className={rx.h2}>{g("insurance.networkTitle")}</h2>
          <form method="get" action={base} className={styles.search} role="search" aria-labelledby="insurance-network">
            <input type="hidden" name="tab" value="network" />
            <label className={`${forms.field} ${styles.searchField}`}>
              <span className={forms.label}>{g("insurance.networkPick")}</span>
              <select className={forms.control} name="company" defaultValue={chosen?.id ?? ""}>
                <option value="" disabled>{g("insurance.networkPickHint")}</option>
                {insurers.map((insurer) => <option key={insurer.id} value={insurer.id}>{pickText(locale, insurer.nameAr, insurer.nameEn) ?? ""}</option>)}
              </select>
            </label>
            <button type="submit" className="nabd-button nabd-button--primary nabd-button--lg"><span className="nabd-button__label">{g("insurance.networkShow")}</span></button>
          </form>
          {networkRead ? (
            <GuestList failed={networkRead.failed} count={providers.length} error={networkLabels.error} empty={networkLabels.empty}>
              <RowsList label={g("insurance.networkTitle")}>
                {providers.map((provider) => (
                  <InsuranceRow key={provider.id} locale={locale} title={pickText(locale, provider.nameAr, provider.nameEn) ?? ""} sub={isProviderType(provider.type) ? t(`providerType.${provider.type}`) : provider.city} />
                ))}
              </RowsList>
            </GuestList>
          ) : (
            <Notice>{g("insurance.networkHint")}</Notice>
          )}
        </section>
      ) : null}
      <h2 id="insurers" className={rx.h2}>{g("insurance.insurersTitle")}</h2>
      <GuestList failed={read.failed} count={insurers.length} error={labels.error} empty={labels.empty}>
        <RowsList label={g("insurance.insurersTitle")}>
          {insurers.map((insurer) => {
            const plans = insurer.plans.map((plan) => pickText(locale, plan.nameAr, plan.nameEn)).filter((name): name is string => !!name);
            return <InsuranceRow key={insurer.id} locale={locale} href={`${base}?${new URLSearchParams({ tab: "network", company: insurer.id }).toString()}`} title={pickText(locale, insurer.nameAr, insurer.nameEn) ?? ""} sub={plans.length ? g("insurance.plans", { plans: plans.join(" · ") }) : undefined} />;
          })}
        </RowsList>
      </GuestList>
      <GuestAction id="insurance-sign-in" title={g("insurance.actionTitle")} body={g("insurance.actionBody")} label={g("insurance.action")} href={signInHref(locale, `${base}/add-policy`)} />
      <p className={styles.note}>{t("disclaimer")}</p>
    </ConsultPage>
  );
}
