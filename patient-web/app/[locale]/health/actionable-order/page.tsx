import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/**
 * Removed as a screen (merge map, owner answer 3 of 2026-10-06): it rendered a consultation's medicines, labs and radiology from a
 * payload in the URL, and health data must not be carried in a URL. The prescription detail and the consultation result now carry
 * the order action. The redirect names its destination without the old query, so the payload is dropped, not forwarded.
 */
export default async function ActionableOrderRedirect({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/health/records?tab=prescriptions`);
}
