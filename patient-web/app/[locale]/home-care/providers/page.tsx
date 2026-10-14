import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractHomeCareProviders } from "@/lib/api/home-care-providers";
import { getPatientHomeCareProviders } from "@/lib/api/home-care-providers-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { RowCard } from "@/components-next/consult/consult-parts";
import { NURSING, RowList, StatusLine } from "@/components-next/nursing/nursing-parts";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import { pickText } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string }> };

/** The approved home care providers (canvas/ServiceHub rows): a row each with its name, city and the approval the server holds. */
export default async function HomeCareProvidersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");
  const token = await requirePatientAccess(locale);
  const response = await getPatientHomeCareProviders(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const frame = (children: React.ReactNode) => (
    <ConsultPage locale={locale} title={t("providersTitle")} backHref={`/${locale}/home-care`}>
      {children}
    </ConsultPage>
  );
  if (!response.ok) return frame(<ConsultState kind="error" title={t("providersUnavailable")} body={t("providersUnavailableBody")} retryLabel={t("retry")} />);
  const providers = extractHomeCareProviders(await response.json().catch(() => null));
  if (providers.length === 0) return frame(<ConsultState kind="empty" icon={NURSING.icon} tone={NURSING.tone} title={t("providersEmpty")} actionLabel={t("browseServices")} actionHref={`/${locale}/home-care/services`} />);
  return frame(
    <RowList label={t("providersTitle")}>
      {providers.map((provider) => (
        <li key={provider.id}>
          <RowCard
            icon="user-circle"
            tone={NURSING.tone}
            title={pickText(locale, provider.nameAr, provider.nameEn) ?? ""}
            sub={provider.city}
            extra={<StatusLine label={t("verified")} tone={DIAG_TONES.good} />}
          />
        </li>
      ))}
    </RowList>,
  );
}
