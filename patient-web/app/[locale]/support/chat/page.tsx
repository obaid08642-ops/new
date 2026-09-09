import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { SupportChatClient } from "@/components-next/support-chat-client";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app support/chat: live agent chat + quick replies + image attachments. */
export default async function SupportChatPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/support`}>{ar ? "الدعم" : "Support"}</Link>
      <h1>{ar ? "دعم نبض" : "Nabd support"}</h1>
      <SupportChatClient locale={locale} />
    </main>
  );
}
