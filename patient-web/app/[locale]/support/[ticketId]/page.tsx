import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { SupportForms } from "@/components-next/support-forms";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/** Ticket thread (parity #25): server-fetched messages + real reply form. */
export default async function SupportTicketPage({ params }: { params: Promise<{ locale: string; ticketId: string }> }) {
  const { locale, ticketId } = await params;
  if (!isLocale(locale)) notFound();
  if (!/^[0-9a-zA-Z_-]{6,80}$/.test(ticketId)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const res = await callPatientApi(`/support/requests/${encodeURIComponent(ticketId)}`, {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (res.status === 404 || !res.ok) notFound();
  const ticket: any = await res.json().catch(() => null);
  const thread = Array.isArray(ticket?.thread) ? ticket.thread : [];

  return (
    <main className="page" dir="rtl">
      <Link href={`/${locale}/support`} className="text-sm underline">رجوع للدعم</Link>
      <h1 className="text-xl font-bold mt-2 mb-1">{String(ticket?.subject || "").slice(0, 160)}</h1>
      <p className="text-sm text-black/60">الحالة: {String(ticket?.status || "—")}</p>
      <div className="mt-3 grid gap-2">
        {thread.map((entry: any, index: number) => (
          <Card key={index}>
            <p className="text-xs text-black/50">{String(entry.role || entry.by || "")} · {entry.at ? String(entry.at).slice(0, 16).replace("T", " ") : ""}</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{String(entry.message || "").slice(0, 2000)}</p>
          </Card>
        ))}
      </div>
      <SupportForms mode="reply" ticketId={ticketId} />
    </main>
  );
}
