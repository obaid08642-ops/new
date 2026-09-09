"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

type Item = { id: string; name: string; price: number; covered: boolean; rejectReason?: string };
type OrderState = {
  status: string; totalAmount: number; coveredAmount: number; coveragePercent: number;
  copayAmount: number; items: Item[];
};

const TERMINAL = new Set(["APPROVED_FULL", "APPROVED_PARTIAL", "REJECTED"]);

function parseOrder(payload: unknown): OrderState | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const r = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const itemsRaw = Array.isArray(r.items) ? r.items : [];
  const items: Item[] = itemsRaw.flatMap((it) => {
    if (!it || typeof it !== "object") return [];
    const o = it as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name : typeof o.test_name === "string" ? o.test_name : null;
    if (!name) return [];
    const statusText = typeof o.status === "string" ? o.status : "";
    return [{
      id: String(o.id ?? o.item_id ?? name),
      name,
      price: Number(o.price ?? 0) || 0,
      covered: statusText !== "مرفوض" && o.covered !== false,
      rejectReason: typeof o.reject_reason === "string" ? o.reject_reason : undefined,
    }];
  });
  return {
    status: typeof r.status === "string" ? r.status : "PENDING",
    totalAmount: Number(r.total_amount ?? r.total ?? 0) || 0,
    coveredAmount: Number(r.covered_amount ?? 0) || 0,
    coveragePercent: Number(r.coverage_percent ?? 0) || 0,
    copayAmount: Number(r.copay_amount ?? 0) || 0,
    items,
  };
}

export function DiagnosticsInsuranceApprovalClient({ orderId, labName, visitType, locale }: {
  orderId: string; labName: string; visitType: string; locale: string;
}) {
  const ar = locale === "ar";
  const [order, setOrder] = useState<OrderState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cashOptIn, setCashOptIn] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/patient/orders/${encodeURIComponent(orderId)}`, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) { setError(ar ? "تعذر تحميل حالة الموافقة" : "Could not load approval status"); return; }
      const parsed = parseOrder(await res.json().catch(() => null));
      if (!parsed) { setError(ar ? "تعذر تحميل حالة الموافقة" : "Could not load approval status"); return; }
      setOrder(parsed); setError(null);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
  }, [orderId, ar]);

  useEffect(() => {
    load();
    timer.current = setInterval(async () => {
      if (order && TERMINAL.has(order.status)) { if (timer.current) clearInterval(timer.current); return; }
      await load();
    }, 3000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load, order?.status]);

  async function toggleCash(item: Item, next: boolean) {
    setSaving(item.id);
    const prev = cashOptIn[item.id] ?? false;
    setCashOptIn((s) => ({ ...s, [item.id]: next }));
    try {
      const res = await fetch(`/api/patient/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(item.id)}/opt-in-cash`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "idempotency-key": `web-optin-${orderId}-${item.id}-${Date.now()}` },
        body: JSON.stringify({ optIn: next }),
        credentials: "same-origin",
      });
      if (!res.ok) { setCashOptIn((s) => ({ ...s, [item.id]: prev })); setError(ar ? "تعذر تحديث الاختيار" : "Could not update choice"); }
      else await load();
    } catch { setCashOptIn((s) => ({ ...s, [item.id]: prev })); setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setSaving(null); }
  }

  if (!order && !error) return <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "تم إرسال الطلب…" : "Order sent…"}</p>;
  if (error && !order) return <p role="alert">{error}</p>;
  if (!order) return null;

  const resolved = TERMINAL.has(order.status);
  const header = order.status === "APPROVED_FULL"
    ? (ar ? "تمت الموافقة بنجاح!" : "Approved!")
    : order.status === "APPROVED_PARTIAL"
      ? (ar ? "موافقة جزئية" : "Partial approval")
      : order.status === "REJECTED"
        ? (ar ? "تم الرفض" : "Rejected")
        : (ar ? "تم إرسال الطلب إلى" : "Order sent to");
  const hybridCash = order.items.filter((i) => !i.covered && order.status !== "REJECTED" && (cashOptIn[i.id] ?? false))
    .reduce((s, i) => s + i.price, 0);
  const finalToPay = order.status === "REJECTED" ? 0 : order.copayAmount + hybridCash + (visitType === "home" ? 50 : 0);
  const checkoutQuery = order.status === "REJECTED"
    ? `visitType=${encodeURIComponent(visitType)}&isInsurance=false&total=${order.totalAmount + (visitType === "home" ? 50 : 0)}`
    : `visitType=${encodeURIComponent(visitType)}&isInsurance=hybrid&copay=${finalToPay}`;

  return (
    <div>
      <h2 role="status">{header} {labName}</h2>
      {error ? <p role="alert">{error}</p> : null}
      <section aria-label={ar ? "تفاصيل التغطية" : "Coverage details"}>
        <ul>
          {order.items.map((item) => (
            <li key={item.id}>
              <span>{item.name} — {item.price} {ar ? "ر.س" : "SAR"}</span>{" "}
              <span>{item.covered ? (ar ? "مغطى" : "Covered") : (ar ? "مرفوض" : "Rejected")}</span>
              {!item.covered && order.status !== "REJECTED" ? (
                <>
                  {item.rejectReason ? <p>{ar ? "سبب الرفض:" : "Reject reason:"} {item.rejectReason}</p> : null}
                  <label>
                    <input type="checkbox" checked={cashOptIn[item.id] ?? false} disabled={saving === item.id}
                      onChange={(e) => toggleCash(item, e.target.checked)} />{" "}
                    {ar ? `أرغب بدفع هذا التحليل نقداً (+ ${item.price} ر.س)` : `Pay cash for this test (+ ${item.price} SAR)`}
                  </label>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      {order.status !== "REJECTED" && resolved ? (
        <section aria-label={ar ? "الملخص المالي" : "Financial summary"}>
          <p>{ar ? "إجمالي التكلفة" : "Total"}: {order.totalAmount}</p>
          <p>{ar ? `يغطيه التأمين (${order.coveragePercent}%)` : `Covered (${order.coveragePercent}%)`}: {order.coveredAmount}</p>
          {visitType === "home" ? <p>{ar ? "رسوم الزيارة المنزلية + 50 ر.س" : "Home visit fee + 50 SAR"}</p> : null}
          {hybridCash > 0 ? <p>{ar ? "تحاليل إضافية (نقداً)" : "Extra tests (cash)"}: {hybridCash}</p> : null}
          <p><strong>{ar ? "المبلغ المطلوب دفعه" : "Amount due"}: {finalToPay}</strong></p>
        </section>
      ) : null}
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {order.status === "REJECTED" ? (
          <>
            <Link href={`/${locale}/diagnostics/checkout?${checkoutQuery}`}>{ar ? "تنفيذ الطلب على حسابي الخاص" : "Proceed self-pay"}</Link>
            <Link href={`/${locale}/consultations`}>{ar ? "اطلب استشارة طبية" : "Request medical consultation"}</Link>
          </>
        ) : resolved ? (
          <Link href={`/${locale}/diagnostics/checkout?${checkoutQuery}`}>{ar ? "المتابعة للدفع وحجز الموعد" : "Continue to payment & booking"}</Link>
        ) : (
          <p role="status">{ar ? "بانتظار قرار التأمين…" : "Waiting for insurance decision…"}</p>
        )}
      </nav>
    </div>
  );
}
