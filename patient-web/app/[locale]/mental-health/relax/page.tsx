import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/**
 * Owner decision B18 (2026-10-14): no breathing or meditation screen without clinical content. The old Relax address
 * (and /breathing, /meditation, which pointed here) goes to the mental health hub.
 */
export default async function RelaxRedirect({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/mental-health`);
}
