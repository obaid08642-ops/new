import { redirect } from "next/navigation";

export default async function pIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/c`);
}
