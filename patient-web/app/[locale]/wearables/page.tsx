import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Watch } from "lucide-react";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { WearableManualForm } from "@/components-next/wearable-manual-form";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">{children}</section>;
}

/** Wearables manual entry (parity #32): recent samples + manual ingest form. */
export default async function WearablesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) redirect(`/${locale}/login`);

  const res = await callPatientApi("/wearables/data?days=7", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const payload: any = res.ok ? await res.json().catch(() => null) : null;
  const rows = Array.isArray(payload?.data) ? payload.data.slice(-12).reverse() : [];

  return (
    <main className="page" dir="rtl">
      <h1 className="text-xl font-bold mb-2"><Watch size={18} aria-hidden="true" /> بيانات الأجهزة القابلة للارتداء</h1>
      <WearableManualForm />
      <h2 className="mt-4 text-lg font-bold">آخر القياسات (7 أيام)</h2>
      {rows.length === 0 ? (
        <Card><p className="text-sm">لا قياسات بعد — سجّل أول قياس يدوي أعلاه.</p></Card>
      ) : (
        <div className="grid gap-2 mt-2">
          {rows.map((row: any) => (
            <Card key={String(row.id)}>
              <div className="flex justify-between text-sm">
                <span>{String(row.metric)}{row.source ? ` · ${String(row.source)}` : ""}</span>
                <strong>{Number(row.value)}{row.unit ? ` ${row.unit}` : ""}</strong>
              </div>
              {row.recorded_at ? <p className="text-xs text-black/50 mt-1">{String(row.recorded_at).slice(0, 16).replace("T", " ")}</p> : null}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
