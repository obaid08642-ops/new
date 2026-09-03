import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export default async function ConsultationsIndexPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  redirect(`/${locale}/consultations/doctors`);
}
