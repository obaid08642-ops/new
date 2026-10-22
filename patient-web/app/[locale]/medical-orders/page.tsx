import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { formatDate } from "@/lib/format-date";
import { ordersOf, type MedicalOrder } from "@/lib/medical-orders/medical-orders";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { RowCard } from "@/components-next/consult/consult-parts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ tab?: string }> };

/** M6 Ord20 "طلباتي الطبية": the doctor's orders, valid first. GET /medical-orders/mine (read on the server). */
export default async function MedicalOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const query = (await searchParams) ?? {};
  const tab = query.tab === "expired" ? "expired" : "valid";
  const t = await getTranslations("MedicalOrders");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/medical-orders/mine", { cache: "no-store" }, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const backHref = `/${locale}/dashboard`;
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={backHref}>
        <ConsultState kind="error" title={t("loadError")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  const orders = ordersOf(await response.json().catch(() => null));
  const shown = orders.filter((o) => (tab === "expired" ? o.expired : !o.expired));

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={backHref}>
      <LinkSegmented
        label={t("title")}
        value={tab}
        options={[
          { value: "valid", label: t("tabValid"), href: `/${locale}/medical-orders` },
          { value: "expired", label: t("tabExpired"), href: `/${locale}/medical-orders?tab=expired` },
        ]}
      />
      {shown.length === 0 ? (
        <ConsultState kind="empty" icon="test-tube" tone={DIAG_TONES.lab} title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <ul className={styles.list}>
          {shown.map((order) => (
            <li key={order.id}>
              <RowCard
                href={`/${locale}/medical-orders/${encodeURIComponent(order.id)}`}
                icon="test-tube"
                tone={DIAG_TONES.lab}
                title={validityLine(t, locale, order)}
                sub={groupsLine(t, order)}
                extra={order.expires_soon ? t("expiresSoon") : undefined}
              />
            </li>
          ))}
        </ul>
      )}
      <ButtonLink href={`/${locale}/consultations/doctors`} label={t("emptyCta")} variant="outline" fullWidth />
    </ConsultPage>
  );
}

function validityLine(t: (key: string) => string, locale: string, order: MedicalOrder): string {
  const until = formatDate(locale, order.valid_until, { dateStyle: "medium" });
  return until ? `${t("expiresOn")} ${until}` : t("title");
}

function groupsLine(t: (key: string) => string, order: MedicalOrder): string {
  const names: string[] = [];
  if (order.groups.labs) names.push(t("groupLabs"));
  if (order.groups.radiology) names.push(t("groupRadiology"));
  if (order.groups.nursing) names.push(t("groupNursing"));
  if (order.groups.prescription) names.push(t("groupPrescription"));
  return names.join(" · ");
}
