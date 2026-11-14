import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractHomeCareProviders } from "@/lib/api/home-care-providers";
import { getPatientHomeCareProviders } from "@/lib/api/home-care-providers-server";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { getDirection, isLocale, type Locale } from "@/lib/i18n";
import { readPublicHomeCareProviders } from "@/lib/api/public-services-server";
import { parsePublicProviders, signInHref } from "@/lib/services/guest";
import { GuestAction, GuestList } from "@/components-next/guest/guest-service";
import { guestListLabels } from "@/components-next/guest/guest-labels";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { RowCard } from "@/components-next/consult/consult-parts";
import { Caret, NURSING, RowList, StatusLine } from "@/components-next/nursing/nursing-parts";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import { pickText } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string }> };

/** The approved home care providers (canvas/ServiceHub rows): a row each with its name, city and the approval the server holds. */
export default async function HomeCareProvidersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");
  const token = await getOptionalPatientAccessToken();
  if (!token) return <GuestHomeCareProviders locale={locale} />;
  const response = await getPatientHomeCareProviders(token);
  if (response.status === 401) redirect(signInHref(locale, `/${locale}/home-care/providers`));
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
            href={`/${locale}/nursing/nurses/${encodeURIComponent(provider.id)}`}
            icon="user-circle"
            tone={NURSING.tone}
            title={pickText(locale, provider.nameAr, provider.nameEn) ?? ""}
            sub={provider.city}
            extra={<StatusLine label={t("verified")} tone={DIAG_TONES.good} />}
            caret={<Caret rtl={getDirection(locale) === "rtl"} />}
          />
        </li>
      ))}
    </RowList>,
  );
}

/**
 * Issue 1550: the providers page of a guest. The published home care providers come from the public GET /providers?type=home_care
 * (no credential); booking a visit asks for the sign-in and comes back to home care. The patient's read is made only with a session.
 */
async function GuestHomeCareProviders({ locale }: { locale: Locale }) {
  const t = await getTranslations("NursingWeb");
  const g = await getTranslations("GuestServices");
  const [read, labels] = await Promise.all([readPublicHomeCareProviders(), guestListLabels(t("providersEmpty"))]);
  const providers = read.failed ? [] : parsePublicProviders(read.body);
  return (
    <ConsultPage locale={locale} title={t("providersTitle")} backHref={`/${locale}/home-care`}>
      <GuestList failed={read.failed} count={providers.length} error={labels.error} empty={labels.empty}>
        <RowList label={t("providersTitle")}>
          {providers.map((provider) => (
            <li key={provider.id}>
              <RowCard icon="user-circle" tone={NURSING.tone} title={pickText(locale, provider.nameAr, provider.nameEn) ?? ""} sub={provider.city} />
            </li>
          ))}
        </RowList>
      </GuestList>
      <GuestAction id="home-care-providers-sign-in" title={g("homeCare.actionTitle")} body={g("homeCare.actionBody")} label={g("homeCare.action")} href={signInHref(locale, `/${locale}/home-care`)} />
    </ConsultPage>
  );
}
