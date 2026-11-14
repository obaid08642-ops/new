import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { BookingStatusClient } from "@/components-next/ordering/booking-status-client";
import styles from "@/components-next/ordering/ordering.module.css";
import { callPatientApi } from "@/lib/api/upstream";
import { extractLabService } from "@/lib/api/labs";
import { getPublicLabService } from "@/lib/api/labs-server";
import { isLocale } from "@/lib/i18n";
import { parseApproval, parseBookingView, parseReminders, parseVisit, type Approval, type BookingView, type Reminder, type Visit } from "@/lib/ordering/lifecycle";
import { parseResultValues } from "@/lib/ordering/results";
import { pickName } from "@/lib/ordering/format";
import { optionalToken } from "@/lib/ordering/server";

type Props = { params: Promise<{ locale: string; id: string }> };

const ID = /^[A-Za-z0-9_.:-]{1,128}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "OrderingFlow" });
  return { title: t("trackTitle"), robots: { index: false, follow: false } };
}

async function read(path: string, token: string): Promise<{ status: number; body: unknown }> {
  const res = await callPatientApi(path, { cache: "no-store" }, token).catch(() => null);
  if (!res) return { status: 0, body: null };
  return { status: res.status, body: res.ok ? await res.json().catch(() => null) : null };
}

/** Lab item names from the public catalogue (the booking answers ids only); an id the catalogue does not know stays out of the map and the screen says "Item n". */
async function itemNames(locale: string, ids: string[]): Promise<Record<string, string>> {
  const rows = await Promise.all(ids.slice(0, 12).map(async (id) => {
    try {
      const res = await getPublicLabService(id);
      const item = res && res.ok ? extractLabService(await res.json().catch(() => null)) : null;
      return item ? ([id, pickName(locale, item.nameAr, item.nameEn)] as const) : null;
    } catch {
      return null;
    }
  }));
  return Object.fromEntries(rows.flatMap((r) => (r && r[1] ? [[r[0], r[1]] as const] : [])));
}

/** Ord08-Ord10 (canvas/Ord08-WaitingStates, Ord09-PartialApproval, Ord10-BookingTracking): the status page of one ordering booking. */
export default async function BookingStatusPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !ID.test(id)) notFound();
  setRequestLocale(locale);
  const token = await optionalToken(locale);
  if (!token) redirect(`/${locale}/login`);
  const t = await getTranslations("OrderingFlow");
  const enc = encodeURIComponent(id);
  const [view, approval, visit, reminders, results] = await Promise.all([
    read(`/ordering/bookings/${enc}`, token),
    read(`/ordering/bookings/${enc}/approval`, token),
    read(`/ordering/bookings/${enc}/visit`, token),
    read(`/ordering/bookings/${enc}/reminders`, token),
    read(`/ordering/bookings/${enc}/results`, token),
  ]);
  if (view.status === 404) notFound();
  const booking: BookingView | null = parseBookingView(view.body);
  const back = `/${locale}/orders`;
  if (!booking) {
    return (
      <ConsultPage locale={locale} title={t("trackTitle")} backHref={back}>
        <section className={styles.card} role="alert">
          <h2 className={styles.title}>{t("trackLoadErr")}</h2>
          <p className={styles.sub}>{t("errGeneric")}</p>
          <Link href={`/${locale}/labs/bookings/${enc}`} className={`${styles.linkBtn} ${styles.cta}`}>{t("retry")}</Link>
        </section>
      </ConsultPage>
    );
  }
  const appr: Approval | null = approval.status === 200 ? parseApproval(approval.body) : null;
  const vis: Visit | null = visit.status === 200 ? parseVisit(visit.body) : null;
  const rem: Reminder[] = reminders.status === 200 ? parseReminders(reminders.body) : [];
  const names = await itemNames(locale, booking.items.map((i) => i.catalogId));

  return (
    <ConsultPage locale={locale} title={t("trackTitle")} backHref={back}>
      <BookingStatusClient locale={locale} booking={booking} approval={appr} visit={vis} reminders={rem} resultsReady={results.status === 200} results={results.status === 200 ? parseResultValues(results.body) : []} names={names} />
    </ConsultPage>
  );
}
