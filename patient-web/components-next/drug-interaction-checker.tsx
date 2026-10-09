"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Input } from "@/components-next/ui-generated/components/Inputs";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import type { ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import styles from "@/components-next/pharmacy/pharmacy.module.css";

type Hit = { severity?: string; note_ar?: string; note?: string };
type Result = { checked?: number; safe?: boolean; interactions?: Hit[] };

/** The three levels the checker states; any other word from the API is not shown as a label. */
function severityOf(value?: string): { key: "ixSeverityHigh" | "ixSeverityMedium" | "ixSeverityLow"; tone: ServiceTone } | null {
  const v = (value || "").toLowerCase();
  if (["high", "severe", "major", "critical", "contraindicated"].includes(v)) return { key: "ixSeverityHigh", tone: PHARMACY_TONE };
  if (["moderate", "medium"].includes(v)) return { key: "ixSeverityMedium", tone: "amber" };
  if (["low", "minor", "mild"].includes(v)) return { key: "ixSeverityLow", tone: "mint" };
  return null;
}

export function DrugInteractionChecker({ locale, initialDrugs = [] }: { locale: string; initialDrugs?: string[] }) {
  const t = useTranslations("PharmacyBrowse");
  const [input, setInput] = useState("");
  const [drugs, setDrugs] = useState<string[]>(initialDrugs.slice(0, 20));
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  function addDrug() {
    const name = input.trim().slice(0, 200);
    if (name.length < 2 || drugs.length >= 20) return;
    if (!drugs.some((d) => d.toLowerCase() === name.toLowerCase())) {
      setDrugs([...drugs, name]);
    }
    setInput("");
  }

  async function check() {
    setError(null);
    setResult(null);
    if (!drugs.length) {
      setError(t("ixNeedOne"));
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/ai/drug-interactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ drugs }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(t("ixFailed"));
        return;
      }
      setResult(data as Result);
    } catch {
      setError(t("ixFailed"));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className={styles.checker}>
      <p className={styles.intro}>{t("ixIntro")}</p>
      <form className={styles.addRow} onSubmit={(event) => { event.preventDefault(); addDrug(); }}>
        <Input value={input} onChange={setInput} label={t("ixDrug")} placeholder={t("ixDrug")} />
        <Button label={t("ixAdd")} variant="secondary" size="lg" type="submit" />
      </form>
      {drugs.length > 0 ? (
        <ul className={styles.drugs} aria-label={t("ixList")}>
          {drugs.map((d) => (
            <li key={d} className={styles.drug}>
              <span>{d}</span>
              <button type="button" className={styles.drugRemove} onClick={() => setDrugs(drugs.filter((x) => x !== d))} aria-label={t("ixRemove", { name: d })}>
                <Icon name="close" size={16} tone="currentColor" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Button label={checking ? t("ixChecking") : t("ixCheck")} size="lg" fullWidth loading={checking} disabled={!drugs.length} onClick={check} />
      {error ? <p role="alert" className={styles.formError}>{error}</p> : null}
      {result ? (
        <section aria-live="polite" className={styles.result}>
          <p className={styles.verdict}>{result.safe ? t("ixSafe") : t("ixAttention")}</p>
          {(result.interactions || []).map((h, i) => {
            const level = severityOf(h.severity);
            const note = locale === "ar" ? h.note_ar || h.note : h.note;
            return (
              <div key={i} className={styles.hit}>
                {level ? <StatusChip label={t(level.key)} tone={level.tone} /> : null}
                {note ? <p>{note}</p> : null}
              </div>
            );
          })}
        </section>
      ) : null}
      <p className={styles.note}>{t("ixAdvisory")}</p>
    </div>
  );
}
