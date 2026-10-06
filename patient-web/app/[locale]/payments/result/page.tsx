import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaymentResult } from "@/components-next/pharmacy-checkout/payment-result";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";

type Query = { ref?: string | string[]; id?: string | string[]; orderId?: string | string[]; status?: string | string[] };
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Query> };
const REFERENCE = /^[A-Za-z0-9_-]{1,128}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const first = (value: string | string[] | undefined) => ((Array.isArray(value) ? value[0] : value) ?? "").trim();

export async function generateMetadata({ params }: Pick<Props, "params">) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Payments" });
  return { title: t("pageTitle") };
}

/**
 * Where the payment provider (or our own links) sends the patient after paying. The address only says WHICH payment:
 * `?ref=` is our transaction reference, `?id=` is the provider's payment id, `?orderId=` the pharmacy order. The
 * `?status=` the provider appends is never read: whether the payment succeeded is what the backend says, asked by the screen.
 */
export default async function PaymentResultPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const query = await searchParams;
  await requirePatientAccess(locale);
  const ref = first(query.ref);
  const gatewayId = first(query.id);
  const orderId = first(query.orderId);
  const reference = [ref, gatewayId].find((value) => REFERENCE.test(value));
  return (
    <PaymentResult
      locale={locale}
      reference={reference}
      transactionId={UUID.test(ref) ? ref : undefined}
      orderId={UUID.test(orderId) ? orderId : undefined}
    />
  );
}
