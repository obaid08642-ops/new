import { redirect } from "next/navigation";

export default async function doctorsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/consultations/doctors`);
}
