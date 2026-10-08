import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** Community is removed (owner decision 1): the old page opens the articles. */
export default async function CommunityRedirect({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/articles`);
}
