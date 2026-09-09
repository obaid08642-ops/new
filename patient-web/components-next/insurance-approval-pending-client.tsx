"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

type ReqState = {
  id?: string; state: string; copayPercent: number; copayAmount: number | null;
  companyName?: string; policyNumber?: string;
};

const APPROVED = new Set(["COPAY_PENDING", "COPAY_PAID", "APPROVED", "CONFIRMED"]);
const REJECTED = new Set(["REJECTED", "DECLINED", "CANCELLED"]);

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function InsuranceApprovalPendingClient({ requestId, bookingId, totalAmount, locale }: {
  requestId?: string; bookingId?: string; totalAmount: number; locale: string;
}) {
  const ar = locale === "ar";
  const [req, setReq] = useState<ReqState | null>(null);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      let request: Record<string, unknown> | null = null;
      if (requestId) {
        const res = await fetch(`/api/patient/insurance/requests/${encodeURIComponent(requestId)}`, { cache: "no-store", credentials: "same-origin" });
        if (res.ok) request = asRecord(await res.json().catch(() => null));
      } else {
        const res = await fetch("/api/patient/insurance/requests/my", { cache: "no-store", credentials: "same-origin" });
        if (res.ok) {
          const payload = asRecord(await res.json().catch(() => null));
          const list = [payload?.data, payload?.requests, payload?.items].find(Array.isArray);
          const arr = (Array.isArray(list) ? list : []).map(asRecord).filter((r): r is Record<string, unknown> => !!r);
          request = (bookingId ? arr.find((r) => r.booking_id === bookingId) : undefined) ?? arr[0] ?? null;
        }
      }
      if (!request) { setError(true); return; }
      const rec = asRecord(request.data) ?? request;
      const profileRes = await fetch("/api/patient/users/me/profile", { cache: "no-store", credentials: "same-origin" });
      const profile = profileRes.ok ? asRecord(await profileRes.json().catch(() => null)) : null;
      const prec = asRecord(profile?.data) ?? profile;
      const insurance = asRecord(prec?.insurance);
      const copayPercent = Number(rec.copay_percent ?? 0) || 0;
      const copayRaw = rec.copay_amount;
      setReq({
        id: typeof rec.id === "string" ? rec.id : undefined,
        state: typeof rec.state === "string" ? rec.state : "PENDING",
        copayPercent,
        copayAmount: typeof copayRaw === "number" ? copayRaw : null,
        companyName: insurance && typeof insurance.provider === "string" ? insurance.provider : undefined,
        policyNumber: insurance && typeof insurance.policy_number === "string" ? insurance.policy_number : undefined,
      });
      setError(false);
    } catch { setError(true); }
  }, [requestId, bookingId, ar]);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 6000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  if (!req && !error) return <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "جاري مراجعة التأمين" : "Reviewing insurance"} — {ar ? "نتحقق من التغطية، عادة أقل من دقيقة." : "Checking coverage, usually under a minute."}</p>;
  if (error && !req) return <p role="alert">{ar ? "تعذر تحميل حالة التأمين" : "Could not load insurance status"}</p>;
  if (!req) return null;

  if (APPROVED.has(req.state)) {
    const copay = req.copayAmount ?? Math.round(totalAmount * req.copayPercent / 100);
    const pays = totalAmount - copay;
    return (
      <div>
        <h2 role="status">{ar ? "تمت الموافقة!" : "Approved!"}</h2>
        <section aria-label={ar ? "تفاصيل التغطية" : "Coverage details"}>
          <p>{ar ? "إجمالي التكلفة" : "Total cost"}: {totalAmount} {ar ? "ر.س" : "SAR"}</p>
          {copay > 0 ? <p>{ar ? `يدفع التأمين (${100 - req.copayPercent}%)` : `Insurance pays (${100 - req.copayPercent}%)`}: {pays}</p> : null}
          {copay > 0
            ? <p>{ar ? `نسبة تحملك (${req.copayPercent}%)` : `Your co-pay (${req.copayPercent}%)`}: {copay} {ar ? "ر.س" : "SAR"}</p>
            : <p>{ar ? "تغطية كاملة" : "Full coverage"}</p>}
          {copay === 0 && req.copayAmount === null ? <p>{ar ? "سيُحدَّد مبلغ التحمل قبل الدفع." : "The co-pay amount will be set before payment."}</p> : null}
        </section>
        <Link href={req.id ? `/${locale}/insurance/copay?approvalCode=${encodeURIComponent(req.id)}&amount=${copay}` : `/${locale}/insurance/claims`}>
          {copay > 0 ? (ar ? `تأكيد ودفع ${copay} ر.س` : `Confirm & pay ${copay} SAR`) : (ar ? "تأكيد" : "Confirm")}
        </Link>
      </div>
    );
  }

  if (REJECTED.has(req.state)) {
    return (
      <div>
        <h2 role="status">{ar ? "لم تتم الموافقة" : "Not approved"}</h2>
        <p>{ar ? "التأمين لا يغطي هذه الخدمة." : "Insurance does not cover this service."}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {totalAmount > 0 ? <Link href={`/${locale}/payments/processing?ref=selfpay-${Date.now()}`}>{ar ? `ادفع كاش — ${totalAmount} ر.س` : `Pay cash — ${totalAmount} SAR`}</Link> : null}
          <Link href={`/${locale}/consultations`}>{ar ? "اتصل بشركة التأمين" : "Contact insurer"}</Link>
          <Link href={`/${locale}/insurance/claims`}>{ar ? "متابعة حالة الطلبات" : "Track requests"}</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "جاري مراجعة التأمين" : "Reviewing insurance"}</p>
      <p>{ar ? "نتحقق من التغطية، عادة أقل من دقيقة." : "Checking coverage, usually under a minute."}</p>
      {req.companyName || req.policyNumber ? (
        <p>{[req.companyName, req.policyNumber].filter(Boolean).join(" · ")}</p>
      ) : null}
      <Link href={`/${locale}/insurance/claims`}>{ar ? "متابعة حالة الطلبات" : "Track requests"}</Link>
    </div>
  );
}
