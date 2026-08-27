import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock3, PackageSearch, ShieldCheck } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { parseOrderId } from "@/lib/api/orders";
import { extractPatientPharmacyOffers } from "@/lib/api/pharmacy-offers";
import { RetryButton } from "@/components-next/retry-button";
import { OfferSelection } from "./offer-selection";
import styles from "./offers.module.css";

type Props = { params: Promise<{ locale: string; orderId: string }> };

const copy = {
  ar: { back: "تفاصيل الطلب", eyebrow: "طلب صيدلية", title: "عروض الصيدليات", notice: "تُعرض فقط الأسعار والأصناف التي أرسلها المزود. لا يتم الدفع إلا بعد اختيار العرض وقبول السعر النهائي الخادمي.", emptyTitle: "لا توجد عروض متاحة بعد", emptyBody: "يمكنك التحديث يدوياً لاحقاً. لا يعني عدم وجود عرض أن الطلب أُلغي.", unavailable: "تعذر تحميل عروض هذا الطلب", available: "متوفر", unavailableItem: "غير متوفر", alternative: "بديل مقترح", total: "إجمالي العرض", preparation: "وقت التجهيز", minutes: "دقيقة", insurance: "تغطية تأمينية", cod: "الدفع عند الاستلام مؤهل", expiration: "انتهاء العرض", unknown: "—", cash: "دفع نقدي أو إلكتروني بعد السعر النهائي", select: "اختيار هذا العرض", loading: "جارٍ تثبيت الاختيار…", selected: "تم تثبيت العرض. لا يزال قبول السعر النهائي مطلوباً قبل الدفع.", error: "تعذر تثبيت العرض؛ ربما انتهت صلاحيته أو اختاره طلب آخر." },
  en: { back: "Order details", eyebrow: "Pharmacy order", title: "Pharmacy offers", notice: "Only prices and items submitted by the provider appear here. Payment is unavailable until one offer is selected and the server final quote is accepted.", emptyTitle: "No offers are available yet", emptyBody: "You may refresh manually later. An empty offer list does not cancel the order.", unavailable: "We could not load offers for this order", available: "Available", unavailableItem: "Unavailable", alternative: "Suggested alternative", total: "Offer total", preparation: "Preparation", minutes: "minutes", insurance: "Insurance coverage", cod: "Cash on delivery eligible", expiration: "Offer expires", unknown: "—", cash: "Cash or online payment after final quote", select: "Select this offer", loading: "Securing selection…", selected: "Offer selected. The server final quote must still be accepted before payment.", error: "The offer could not be selected; it may have expired or another selection won." },
};

export default async function PharmacyOffersPage({ params }: Props) {
  const { locale, orderId } = await params;
  if (!isLocale(locale) || !parseOrderId(orderId).success) notFound();
  const language = locale === "ar" ? "ar" : "en";
  const t = copy[language];
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/patient/pharmacy/orders/${orderId}/offers`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageSearch aria-hidden="true" /><h1>{t.unavailable}</h1><RetryButton /></section></main>;
  const offers = extractPatientPharmacyOffers(await response.json().catch(() => null));
  const currency = (value?: string) => value || "SAR";
  return <main className={`main ${styles.page}`}>
    <Link className={styles.back} href={`/${locale}/orders/${orderId}`}>{t.back}</Link>
    <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t.eyebrow}</p><h1>{t.title}</h1><p>{t.notice}</p></div><PackageSearch aria-hidden="true" /></section>
    {offers.length === 0 ? <section className={styles.state}><Clock3 aria-hidden="true" /><h2>{t.emptyTitle}</h2><p>{t.emptyBody}</p><RetryButton /></section> : <section className={styles.list} aria-label={t.title}>{offers.map((offer) => <article className={styles.offer} key={offer.id}><header><div><h2>{offer.pharmacyName || t.unknown}</h2><p>{offer.status || t.unknown}</p></div><strong>{offer.total === undefined ? t.unknown : `${offer.total.toFixed(2)} ${currency(offer.currency)}`}</strong></header><dl><div><dt>{t.total}</dt><dd>{offer.total === undefined ? t.unknown : `${offer.total.toFixed(2)} ${currency(offer.currency)}`}</dd></div><div><dt>{t.preparation}</dt><dd>{offer.preparationMinutes === undefined ? t.unknown : `${offer.preparationMinutes} ${t.minutes}`}</dd></div>{offer.expiresAt && <div><dt>{t.expiration}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(offer.expiresAt))}</dd></div>}</dl><ul>{offer.lines.map((line) => <li key={line.id}><span>{line.name}</span><span className={line.available ? styles.available : styles.unavailable}>{line.available ? t.available : t.unavailableItem}</span>{line.alternative && <small>{t.alternative}: {line.alternative}</small>}</li>)}</ul><footer>{offer.insuranceReady && <span>{t.insurance}</span>}{offer.codAllowed && <span>{t.cod}</span>}{offer.status === "open" ? <OfferSelection orderId={orderId} offerId={offer.id} insuranceReady={offer.insuranceReady} labels={{ cash: t.cash, insurance: t.insurance, select: t.select, loading: t.loading, selected: t.selected, error: t.error }} /> : <span className={styles.actionNotice}>{t.selected}</span>}</footer></article>)}</section>}
  </main>;
}
