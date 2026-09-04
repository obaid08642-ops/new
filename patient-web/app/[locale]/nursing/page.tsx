import { redirect } from "next/navigation";

export default async function nursingIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/nursing/catalog`);
}
