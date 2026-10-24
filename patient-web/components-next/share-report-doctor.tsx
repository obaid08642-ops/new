"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Input } from "@/components-next/ui-generated/components/Inputs";
import type { ReportShare } from "@/lib/consult/report-share";
import styles from "@/components-next/consult/consult.module.css";

type Hit = { id: string; name: string };

/** Share one report with a named doctor on the platform (the app's second share mode): search, share, list who has it, revoke. */
export function ShareWithDoctor({ reportId, locale }: { reportId: string; locale: string }) {
  const t = useTranslations("ShareReport");
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ReportShare[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/medical-reports/${encodeURIComponent(reportId)}/share`).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    setShares(Array.isArray(data?.shares) ? data.shares : []);
  }, [reportId]);
  useEffect(() => { if (open) void load(); }, [open, load]);

  async function search() {
    if (query.trim().length < 2 || busy) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/medical-reports/doctor-search?q=${encodeURIComponent(query.trim())}&locale=${encodeURIComponent(locale)}`).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    setHits(Array.isArray(data?.doctors) ? data.doctors : []);
    if (!res?.ok) setMessage({ tone: "error", text: t("doctorSearchFailed") });
    setBusy(false);
  }

  async function share(doctor: Hit) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/medical-reports/${encodeURIComponent(reportId)}/share`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ doctor_profile_id: doctor.id, ...(doctor.name ? { doctor_name: doctor.name } : {}) }) }).catch(() => null);
    if (res?.ok) { setMessage({ tone: "ok", text: t("doctorShared") }); await load(); } else setMessage({ tone: "error", text: t("doctorShareFailed") });
    setBusy(false);
  }

  async function revoke(doctorId: string) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/medical-reports/${encodeURIComponent(reportId)}/share/${encodeURIComponent(doctorId)}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) await load(); else setMessage({ tone: "error", text: t("doctorRevokeFailed") });
    setBusy(false);
  }

  if (!open) return <Button variant="ghost" size="md" label={t("shareWithDoctor")} onClick={() => setOpen(true)} />;
  return (
    <div className={styles.stack}>
      <Input label={t("doctorSearchLabel")} placeholder={t("doctorSearchPh")} value={query} onChange={setQuery} />
      <Button variant="outline" size="md" label={busy ? t("searching") : t("doctorSearch")} disabled={busy || query.trim().length < 2} onClick={() => void search()} />
      {hits !== null ? (hits.length === 0 ? <p className={`${styles.body} ${styles.muted}`}>{t("noDoctors")}</p> : (
        <ul className={styles.list} aria-label={t("doctorSearchLabel")}>
          {hits.map((doctor) => (
            <li key={doctor.id} className={styles.pickRow}>
              <span className={styles.rowBody}><span className={styles.rowTitle}>{doctor.name || t("doctorFallback")}</span></span>
              <Button size="md" label={t("shareWithThisDoctor")} disabled={busy || shares.some((s) => s.doctorId === doctor.id)} onClick={() => void share(doctor)} />
            </li>
          ))}
        </ul>
      )) : null}
      <h3 className={styles.rowTitle}>{t("sharedWith")}</h3>
      {shares.length === 0 ? <p className={`${styles.body} ${styles.muted}`}>{t("notSharedYet")}</p> : (
        <ul className={styles.list}>
          {shares.map((share) => (
            <li key={share.doctorId} className={styles.pickRow}>
              <span className={styles.rowBody}><span className={styles.rowTitle}>{share.doctorName || t("doctorFallback")}</span></span>
              <Button variant="outline" size="md" label={t("revoke")} disabled={busy} onClick={() => void revoke(share.doctorId)} />
            </li>
          ))}
        </ul>
      )}
      {message ? <p className={message.tone === "ok" ? styles.ok : styles.error} role={message.tone === "ok" ? "status" : "alert"}>{message.text}</p> : null}
    </div>
  );
}
