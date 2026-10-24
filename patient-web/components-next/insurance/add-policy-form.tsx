"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Notice } from "@/components-next/consult/consult-parts";
import type { CompanyRow, NetworkRow } from "@/lib/insurance/view";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";

/** The card photo the reader accepts (the route allows about 6 MB of image). */
const MAX_CARD_BYTES = 5 * 1024 * 1024;

/** The optional fields of the body: only the ones the patient filled (the app omits an empty one too). */
export function policyOptionals(input: { memberId: string; memberName: string; expiry: string }): { member_id?: string; member_name?: string; expiry_date?: string } {
  const out: { member_id?: string; member_name?: string; expiry_date?: string } = {};
  if (input.memberId.trim()) out.member_id = input.memberId.trim();
  if (input.memberName.trim()) out.member_name = input.memberName.trim();
  if (input.expiry.trim()) out.expiry_date = input.expiry.trim();
  return out;
}

/** Add a policy (POST /api/insurance/policy, the body and the idempotency key as before), then the hub. The insurer is chosen here. */
/** The saved policy, to change it in place (the app edits the saved values; the patient does not start from a blank form). */
export type PolicyPrefill = { companyId?: string; policyNumber?: string; memberId?: string; memberName?: string; expiry?: string; network?: string };

export function AddPolicyForm({ companies, locale, returnTo, initial }: { companies: CompanyRow[]; locale: string; returnTo?: string; initial?: PolicyPrefill }) {
  const t = useTranslations("InsuranceWeb");
  const router = useRouter();
  const [companyId, setCompanyId] = useState(initial?.companyId ?? "");
  const [policyNumber, setPolicyNumber] = useState(initial?.policyNumber ?? "");
  const [memberId, setMemberId] = useState(initial?.memberId ?? "");
  const [memberName, setMemberName] = useState(initial?.memberName ?? "");
  const [expiry, setExpiry] = useState(initial?.expiry ?? "");
  const [networks, setNetworks] = useState<NetworkRow[]>([]);
  const [network, setNetwork] = useState(initial?.network ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // the chosen insurer's networks (GET /insurance/companies/:id/networks); a failed read just leaves the chips out
  useEffect(() => {
    if (!companyId) { setNetworks([]); return; }
    const controller = new AbortController();
    fetch(`/api/insurance/networks?company_id=${encodeURIComponent(companyId)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { networks?: NetworkRow[] } | null) => {
        const list = Array.isArray(data?.networks) ? data.networks : [];
        setNetworks(list);
        // keep the saved network when it is one of this insurer's (by code or name); a network of another insurer is dropped
        setNetwork((current) => list.find((n) => n.code === current || n.name === current)?.code ?? "");
      })
      .catch(() => { if (!controller.signal.aborted) setNetworks([]); });
    return () => controller.abort();
  }, [companyId]);

  /** The card photo goes to POST /insurance/ocr-extract (as the app's "scan the card"); what it reads fills the fields, the patient checks them before saving. */
  async function onScan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null); setScanned(false);
    const mime = file.type;
    if ((mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/webp") || file.size > MAX_CARD_BYTES) { setError(t("add.scanFailed")); return; }
    setScanning(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/insurance/ocr-extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image_base64: dataUrl.slice(dataUrl.indexOf(",") + 1), mime_type: mime }) });
      const data = (await res.json().catch(() => null)) as { success?: boolean; extracted_data?: Record<string, string> } | null;
      if (!res.ok || !data?.success || !data.extracted_data) { setError(t("add.scanFailed")); return; }
      const found = data.extracted_data;
      if (found.policy_number) setPolicyNumber(found.policy_number);
      if (found.national_id) setMemberId(found.national_id);
      if (found.member_name) setMemberName(found.member_name);
      if (found.expiry_date && /^\d{4}-\d{2}-\d{2}$/.test(found.expiry_date)) setExpiry(found.expiry_date);
      const needle = found.provider?.toLowerCase();
      const match = needle ? companies.find((company) => company.name.toLowerCase().includes(needle) || needle.includes(company.name.toLowerCase())) : undefined;
      if (match) setCompanyId(match.id);
      setScanned(true);
    } catch {
      setError(t("add.scanFailed"));
    } finally {
      setScanning(false);
    }
  }

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
          ...policyOptionals({ memberId, memberName, expiry }),
          ...(network ? { network } : {}),
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
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden aria-label={t("add.scan")} onChange={(event) => void onScan(event)} />
      <Button type="button" label={t("add.scan")} variant="outline" size="lg" fullWidth loading={scanning} onClick={() => fileRef.current?.click()} />
      {scanned ? <div role="status"><Notice>{t("add.scanned")}</Notice></div> : null}
      <label className={forms.field}>
        <span className={forms.label}>{t("add.company")}</span>
        <select className={forms.control} value={companyId} onChange={(event) => setCompanyId(event.target.value)} required>
          <option value="">{t("add.companyPlaceholder")}</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
      </label>
      {networks.length > 0 ? (
        <div className={forms.field} role="group" aria-label={t("add.network")}>
          <span className={forms.label}>{t("add.network")}</span>
          <div className={forms.choices}>
            {networks.map((item) => (
              <button key={item.code} type="button" className={forms.choice} aria-pressed={network === item.code} onClick={() => setNetwork(network === item.code ? "" : item.code)}>{item.name}</button>
            ))}
          </div>
        </div>
      ) : null}
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
