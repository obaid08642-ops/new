import { redirect } from "next/navigation";

export default async function medicineIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/medicines`);
}
