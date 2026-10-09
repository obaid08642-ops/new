"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import type { CompanyRow } from "@/lib/insurance/view";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";

/** Add a policy (POST /api/insurance/policy, the body and the idempotency key as before), then the hub. The insurer is chosen here. */
export function AddPolicyForm({ companies, locale, returnTo }: { companies: CompanyRow[]; locale: string; returnTo?: string }) {
  const t = useTranslations("InsuranceWeb");
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!companyId || policyNumber.trim().length < 3) { setError(t("add.invalid")); return; }
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
      if (!res.ok) { setError((data as { message?: string } | null)?.message || t("add.failed")); return; }
      router.push(returnTo ?? `/${locale}/insurance`);
      router.refresh();
    } catch {
      setError(t("add.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${rx.card} ${forms.stack}`} noValidate aria-label={t("add.title")}>
      <label className={forms.field}>
        <span className={forms.label}>{t("add.company")}</span>
        <select className={forms.control} value={companyId} onChange={(event) => setCompanyId(event.target.value)} required>
          <option value="">{t("add.companyPlaceholder")}</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("add.policyNumber")}</span>
        <input className={forms.control} value={policyNumber} onChange={(event) => setPolicyNumber(event.target.value)} required minLength={3} maxLength={64} dir="ltr" autoComplete="off" />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("add.memberId")}</span>
        <input className={forms.control} value={memberId} onChange={(event) => setMemberId(event.target.value)} maxLength={64} dir="ltr" autoComplete="off" />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("add.memberName")}</span>
        <input className={forms.control} value={memberName} onChange={(event) => setMemberName(event.target.value)} maxLength={128} />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("add.expiry")}</span>
        <input className={forms.control} type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
      </label>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("add.submit")} size="lg" fullWidth loading={saving} />
    </form>
  );
}
