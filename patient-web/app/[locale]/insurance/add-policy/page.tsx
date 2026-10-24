import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { parseCompanies, type CompanyRow } from "@/lib/insurance/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { Notice } from "@/components-next/consult/consult-parts";
import { getPatientInsurancePolicy } from "@/lib/api/insurance-server";
import { parseInsuranceSummary } from "@/lib/api/insurance";
import { AddPolicyForm, type PolicyPrefill } from "@/components-next/insurance/add-policy-form";
import { safeNextPath } from "@/lib/auth/safe-next";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string | string[] }> };

/** Add a policy (canvas/Insurance, the plus button): the insurer is chosen from GET /insurance/companies, then the policy is saved. */
export default async function InsuranceAddPolicyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  // Back to where the policy was asked for (e.g. checkout), only a safe in-app path (needs-review issue 1019).
  const nextRaw = (await searchParams).next;
  const returnTo = safeNextPath(Array.isArray(nextRaw) ? nextRaw[0] : nextRaw) ?? undefined;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("InsuranceWeb");
  const token = await requirePatientAccess(locale);
  let companies: CompanyRow[] = [];
  let failed = false;
  try {
    const res = await callPatientApi("/insurance/companies", {}, token);
    if (res.status === 401) redirect(`/${locale}/login`);
    if (res.status === 403 || res.status === 404) notFound();
    if (res.ok) companies = parseCompanies(await res.json().catch(() => null));
    else failed = true;
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    failed = true;
  }

  // changing the saved policy starts from its values (a patient without one gets the blank form)
  let initial: PolicyPrefill | undefined;
  try {
    const policyRes = await getPatientInsurancePolicy(token);
    const summary = policyRes.ok ? parseInsuranceSummary(await policyRes.json().catch(() => null)) : null;
    if (summary?.hasPolicy) {
      const company = companies.find((c) => c.name === summary.companyName);
      initial = { companyId: company?.id, policyNumber: summary.policyNumber, memberId: summary.memberId, memberName: summary.memberName, expiry: summary.expiryDate?.slice(0, 10), network: summary.network };
    }
  } catch {
    initial = undefined;
  }

  return (
    <ConsultPage locale={locale} title={t("add.title")} backHref={`/${locale}/insurance`}>
      <Notice>{t("add.lead")}</Notice>
      {failed ? <div role="alert"><Notice warn>{t("add.companiesFailed")}</Notice></div> : null}
      <AddPolicyForm companies={companies} locale={locale} returnTo={returnTo} initial={initial} />
    </ConsultPage>
  );
}
