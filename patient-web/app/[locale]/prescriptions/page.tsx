import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** The prescriptions list lives once, as the Prescriptions tab of the records screen (as in the app): this old route goes there. */
export default async function PrescriptionsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/health/records?tab=prescriptions`);
}
