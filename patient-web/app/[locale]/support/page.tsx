import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { SupportForms } from "@/components-next/support-forms";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/** Support hub (parity #25): my tickets + new ticket form. */
export default async function SupportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const res = await callPatientApi("/support/requests/mine", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const tickets: any = res.ok ? await res.json().catch(() => []) : [];
  const list = Array.isArray(tickets) ? tickets : Array.isArray(tickets?.items) ? tickets.items : [];

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><LifeBuoy size={18} aria-hidden="true" /> الدعم الفني</h1>
      {list.length === 0 ? (
        <Card><p className="text-sm">لا توجد تذاكر سابقة.</p></Card>
      ) : (
        <div className="grid gap-2">
          {list.slice(0, 30).map((ticket: any) => (
            <Link key={String(ticket.id)} href={`/${locale}/support/${encodeURIComponent(String(ticket.id))}`} className="rounded-xl border border-black/10 bg-white p-3 shadow-sm text-sm flex justify-between no-underline">
              <span className="min-w-0 truncate">{String(ticket.subject || ticket.id).slice(0, 100)}</span>
              <span className="text-black/60 whitespace-nowrap">{String(ticket.status || "")}</span>
            </Link>
          ))}
        </div>
      )}
      <SupportForms mode="new" />
    </main>
  );
}
