import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export default async function HealthIdRedirect({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/reports/passport`);
}
