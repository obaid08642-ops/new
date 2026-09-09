import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app health/add-family-member: adding members lives on the family invite screen. */
export default async function HealthAddFamilyMemberPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  redirect(`/${locale}/family/invite`);
}
