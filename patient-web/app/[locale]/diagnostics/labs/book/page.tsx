import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ serviceId?: string }> };

/** Legacy booking entry: a test opens the order item page (about, preparation, price, add to the basket, providers), as the app's lab test row. */
export default async function LabBookingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { serviceId } = await searchParams;
  if (!serviceId) notFound();
  redirect(`/${locale}/labs/${encodeURIComponent(serviceId)}?kind=lab`);
}
