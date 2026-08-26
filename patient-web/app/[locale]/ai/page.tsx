import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { isLocale } from "@/lib/i18n";
import { AiTools } from "@/components-next/ai-tools";

/**
 * AI tools hub (parity #20): triage, prescription photo translation and the
 * structured skin self-check — all real upstream calls, results verbatim.
 */
export default async function AiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><Sparkles size={18} aria-hidden="true" /> المساعد الذكي</h1>
      <AiTools />
      <p className="mt-3 text-xs text-black/50">هذه أدوات إرشادية ولا تُغني عن استشارة مقدم الرعاية.</p>
    </main>
  );
}
