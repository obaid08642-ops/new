import { redirect } from "next/navigation";

export default async function radiologyIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/diagnostics/radiology`);
}
