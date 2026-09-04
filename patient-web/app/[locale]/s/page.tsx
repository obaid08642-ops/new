import { redirect } from "next/navigation";

export default async function sIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = searchParams ? await searchParams : {};
  const query = typeof sp.q === "string" ? `?q=${encodeURIComponent(sp.q)}` : "";
  redirect(`/${locale}/search${query}`);
}
