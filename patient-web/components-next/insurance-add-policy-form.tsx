"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InsuranceAddPolicyForm({ companies, locale }: { companies: Array<{ id: string; name: string }>; locale: string }) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!companyId || policyNumber.trim().length < 3) {
      setError(locale === "ar" ? "اختر الشركة وأدخل رقم وثيقة صحيحاً (3 أحرف على الأقل)" : "Select a company and enter a valid policy number");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/insurance/policy", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `${Date.now()}-${Math.random().toString(36).slice(2)}-${policyNumber.trim()}`.slice(0, 64),
        },
        body: JSON.stringify({
          company_id: companyId,
          policy_number: policyNumber.trim(),
          member_id: memberId.trim(),
          member_name: memberName.trim(),
          expiry_date: expiry.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (locale === "ar" ? "تعذر حفظ الوثيقة" : "Could not save policy"));
        return;
      }
      router.push(`/${locale}/insurance`);
      router.refresh();
    } catch {
      setError(locale === "ar" ? "تعذر حفظ الوثيقة" : "Could not save policy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{locale === "ar" ? "شركة التأمين" : "Insurance company"}</span>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
          <option value="">{locale === "ar" ? "اختر الشركة" : "Select company"}</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{locale === "ar" ? "رقم الوثيقة" : "Policy number"}</span>
        <input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} required minLength={3} maxLength={64} placeholder={locale === "ar" ? "مثال: POL-123456" : "e.g. POL-123456"} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{locale === "ar" ? "رقم العضوية (اختياري)" : "Member ID (optional)"}</span>
        <input value={memberId} onChange={(e) => setMemberId(e.target.value)} maxLength={64} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{locale === "ar" ? "اسم العضو (اختياري)" : "Member name (optional)"}</span>
        <input value={memberName} onChange={(e) => setMemberName(e.target.value)} maxLength={128} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{locale === "ar" ? "تاريخ الانتهاء (اختياري)" : "Expiry date (optional)"}</span>
        <input value={expiry} onChange={(e) => setExpiry(e.target.value)} maxLength={32} placeholder="YYYY-MM-DD" />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (locale === "ar" ? "جارٍ الحفظ…" : "Saving…") : (locale === "ar" ? "حفظ الوثيقة" : "Save policy")}</button>
    </form>
  );
}
