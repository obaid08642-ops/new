import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { parseCompanies, type CompanyRow } from "@/lib/insurance/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { Notice } from "@/components-next/consult/consult-parts";
import { AddPolicyForm } from "@/components-next/insurance/add-policy-form";

type Props = { params: Promise<{ locale: string }> };

/** Add a policy (canvas/Insurance, the plus button): the insurer is chosen from GET /insurance/companies, then the policy is saved. */
export default async function InsuranceAddPolicyPage({ params }: Props) {
  const { locale } = await params;
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

  return (
    <ConsultPage locale={locale} title={t("add.title")} backHref={`/${locale}/insurance`}>
      <Notice>{t("add.lead")}</Notice>
      {failed ? <div role="alert"><Notice warn>{t("add.companiesFailed")}</Notice></div> : null}
      <AddPolicyForm companies={companies} locale={locale} />
    </ConsultPage>
  );
}
