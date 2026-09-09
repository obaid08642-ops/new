import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientAddresses } from "@/lib/api/addresses-server";
import { DeliveryAddressSelectClient } from "@/components-next/delivery-address-select-client";
import type { PatientAddress } from "@/components-next/addresses";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app delivery/address-select: saved addresses + default preselect + map fallback. */
export default async function DeliveryAddressSelectPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await getPatientAddresses(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const payload = response.ok ? await response.json().catch(() => null) : null;
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const raw = [root.addresses, root.data].find(Array.isArray);
  const addresses: PatientAddress[] = (Array.isArray(raw) ? raw : []).flatMap((a) => {
    if (!a || typeof a !== "object" || typeof (a as Record<string, unknown>).id !== "string") return [];
    return [a as PatientAddress];
  });
  return (
    <main className="main">
      <Link href={`/${locale}/cart`}>{ar ? "السلة" : "Cart"}</Link>
      <h1>{ar ? "عنوان التوصيل" : "Delivery address"}</h1>
      <DeliveryAddressSelectClient addresses={addresses} locale={locale} />
    </main>
  );
}
