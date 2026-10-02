import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { VectorInsurance } from "@/components-next/vector-illustrations";
import styles from "./payment-result.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string; ref?: string; id?: string }> };

export default async function PaymentResultPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  // Moyasar returns ?id=pay_…&status=…; our own links use ?ref=. The query status is never proof of payment.
  const { status = "processing", ref: refParam = "", id: gatewayId = "" } = await searchParams;
  const ref = refParam || gatewayId;
  const t = await getTranslations("Payments");
  const token = await requirePatientAccess(locale);

  let verified: string | null = null;
  if (ref && /^[A-Za-z0-9_-]{1,128}$/.test(ref)) {
    const res = await callPatientApi(`/payments/status/${encodeURIComponent(ref)}`, {}, token);
    if (res.status === 401) redirect(`/${locale}/login`);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const s = data?.data?.status ?? data?.status;
      if (typeof s === "string") verified = s.toLowerCase();
    }
  }
  // R70: success is shown only after the server verified the payment. Without verification an address with
  // ?status=paid used to show "payment confirmed and linked to your order" (even for an unknown payment id).
  const finalStatus = verified ?? (["failed", "failure", "declined", "cancelled"].includes(status) ? status : "processing");
  const ok = ["success", "paid", "completed", "succeeded"].includes(finalStatus);
  const failed = ["failed", "failure", "declined", "cancelled"].includes(finalStatus);

  return <main className={`main ${styles.page}`}>
    <section className={styles.card}>
      <VectorInsurance size={48} aria-hidden="true" />
      {ok ? <CheckCircle2 size={48} className={styles.ok} aria-hidden="true" />
        : failed ? <XCircle size={48} className={styles.fail} aria-hidden="true" />
        : <Loader2 size={48} className={styles.pending} aria-hidden="true" />}
      <h1>{ok ? t("successTitle") : failed ? t("failedTitle") : t("processingTitle")}</h1>
      <p>{ok ? t("successBody") : failed ? t("failedBody") : t("processingBody")}</p>
      {ref ? <p className={styles.ref}>{t("reference")}: {ref}</p> : null}
      <div className={styles.actions}>
        {failed ? <Link className={styles.primary} href={`/${locale}/cart/checkout`}>{t("retry")}</Link> : null}
        <Link className={ok ? styles.primary : styles.secondary} href={`/${locale}/orders`}>{t("myOrders")}</Link>
      </div>
    </section>
  </main>;
}
