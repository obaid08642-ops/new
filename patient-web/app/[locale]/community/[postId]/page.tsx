import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string; postId: string }> };

/** Community is removed (owner decision 1): a stale link to a post opens the articles. */
export default async function CommunityPostRedirect({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/articles`);
}
