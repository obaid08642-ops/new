import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ prescriptionId?: string; id?: string }> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
type RxLine = { name: string; qty: number };
function linesOf(rx: Record<string, unknown>): RxLine[] {
  const raw = [rx.items, rx.lines, rx.medications].find(Array.isArray);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((it) => {
    if (typeof it === "string") return [{ name: it, qty: 1 }];
    const o = asRecord(it);
    if (!o) return [];
    const name = typeof o.name === "string" ? o.name : null;
    if (!name) return [];
    return [{ name, qty: Math.max(1, Number(o.qty ?? o.quantity ?? 1) || 1) }];
  });
}

/** Parity with app rx-order: pick an active prescription (or a specific one) then continue to checkout. */
export default async function PharmacyRxOrderPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const requestedId = (sp.prescriptionId || sp.id || "").trim();
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);

  if (requestedId) {
    const res = await callPatientApi(`/prescriptions/${encodeURIComponent(requestedId)}`, {}, token);
    if (res.status === 401) redirect(`/${locale}/login`);
    if (!res.ok) notFound();
    const raw = asRecord(await res.json().catch(() => null));
    const rx = asRecord(raw?.data) ?? raw;
    if (!rx) notFound();
    const lines = linesOf(rx);
    return (
      <main className="main">
        <Link href={`/${locale}/pharmacy`}>{ar ? "الصيدلية" : "Pharmacy"}</Link>
        <h1>{ar ? "طلب أدوية الوصفة" : "Order prescription medicines"}</h1>
        <p>{ar ? "تُرسل هذه الوصفة للصيدلية لصرف أصنافها." : "This prescription is sent to the pharmacy to dispense its items."}</p>
        {lines.length === 0 ? (
          <p role="status">{ar ? "لا توجد أصناف في هذه الوصفة" : "No items in this prescription"}</p>
        ) : (
          <>
            <ul>{lines.map((l, i) => <li key={i}>{l.name} — {ar ? "الكمية:" : "Qty:"} {l.qty}</li>)}</ul>
            <Link href={`/${locale}/cart/checkout?prescriptionId=${encodeURIComponent(requestedId)}`}>{ar ? "مراجعة العنوان وطلب عروض" : "Review address & request offers"}</Link>
          </>
        )}
      </main>
    );
  }

  const res = await callPatientApi("/prescriptions/active", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (!res.ok) notFound();
  const payload = await res.json().catch(() => null);
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const list = [root.data, root.items, root.prescriptions].find(Array.isArray);
  const active = (Array.isArray(list) ? list : []).flatMap((it) => {
    const o = asRecord(it);
    if (!o || typeof o.id !== "string") return [];
    return [{ id: o.id, count: linesOf(o).length }];
  });
  return (
    <main className="main">
      <Link href={`/${locale}/pharmacy`}>{ar ? "الصيدلية" : "Pharmacy"}</Link>
      <h1>{ar ? "طلب أدوية الوصفة" : "Order prescription medicines"}</h1>
      <p>{ar ? "اختر وصفة نشطة لصرف أدويتها." : "Choose an active prescription to dispense."}</p>
      {active.length === 0 ? (
        <p role="status">{ar ? "لا توجد وصفات نشطة" : "No active prescriptions"}</p>
      ) : (
        <ul>
          {active.map((rx) => (
            <li key={rx.id}>
              <Link href={`/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(rx.id)}`}>
                {ar ? `وصفة #${rx.id.slice(-6)}` : `Prescription #${rx.id.slice(-6)}`} — {rx.count} {ar ? "أصناف" : "items"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
