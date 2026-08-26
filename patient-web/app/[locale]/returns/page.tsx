import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Undo2 } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { RefundRequestForm } from "@/components-next/refund-request-form";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/**
 * Returns hub (parity #26): my refund requests + a new request form.
 * Amount/percent are computed upstream from the stored booking — the form
 * only collects booking id + reason.
 */
export default async function ReturnsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const res = await callPatientApi("/refunds/my", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const refunds: any = res.ok ? await res.json().catch(() => []) : [];
  const list = Array.isArray(refunds) ? refunds : Array.isArray(refunds?.items) ? refunds.items : [];

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><Undo2 size={18} aria-hidden="true" /> الإرجاع والاسترداد</h1>
      {list.length === 0 ? (
        <Card><p className="text-sm">لا توجد طلبات استرداد سابقة.</p></Card>
      ) : (
        <div className="grid gap-2">
          {list.slice(0, 30).map((refund: any) => (
            <Card key={String(refund.id)}>
              <div className="flex justify-between text-sm">
                <span className="min-w-0 truncate">{String(refund.booking_id || refund.id)}</span>
                <strong>{Number(refund.refund_amount ?? 0)} ر.س ({Number(refund.refund_percent ?? 0)}%)</strong>
              </div>
              <p className="text-xs mt-1 text-black/60">
                الحالة: {String(refund.state || "—")} · {String(refund.policy_note_ar || "")}
              </p>
            </Card>
          ))}
        </div>
      )}

      <RefundRequestForm />

      <p className="mt-3 text-xs text-black/50">
        نسبة الاسترداد تُحدد من سياسة الإلغاء على الخادم حسب موعد الخدمة —
        <Link href={`/${locale}/orders`} className="underline"> اطّلع على طلباتك</Link> لنسخ معرّف الحجز.
      </p>
    </main>
  );
}
