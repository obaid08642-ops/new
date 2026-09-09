import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { FamilyChatClient } from "@/components-next/family-chat-client";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app family/chat: real backend feed polled every 5s + optimistic send. */
export default async function FamilyChatPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/family`}>{ar ? "العائلة" : "Family"}</Link>
      <h1>{ar ? "محادثة العائلة" : "Family chat"}</h1>
      <FamilyChatClient locale={locale} />
    </main>
  );
}
