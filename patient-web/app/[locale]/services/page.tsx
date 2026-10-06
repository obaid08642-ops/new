import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

/**
 * The web has no separate services index: the nine services are the grid on Home (HomeWeb board). `/services`
 * used to land on `/consultations/doctors`, a page that still draws inline styles the CSP refuses; it now
 * lands on Home, which is public and is the services list.
 */
export default async function servicesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}`);
}
