"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import forms from "@/components-next/consult/consult.module.css";
import styles from "./settings.module.css";

export type FaqItem = { id: string; question: string; answer: string; category: string | null };

/**
 * The FAQ of the help screen (HelpTab of the app): category chips ("All" and each category the server sent) when there is more
 * than one category, then the questions; a question opens in place.
 */
export function FaqList({ faqs, label }: { faqs: FaqItem[]; label: string }) {
  const t = useTranslations("SettingsWeb");
  const [category, setCategory] = useState<string | null>(null);
  const categories = useMemo(() => Array.from(new Set(faqs.flatMap((faq) => (faq.category ? [faq.category] : [])))), [faqs]);
  const shown = category ? faqs.filter((faq) => faq.category === category) : faqs;
  return (
    <div className={forms.stack}>
      {categories.length > 1 ? (
        <div className={forms.choices} role="group" aria-label={label}>
          <button type="button" className={forms.choice} aria-pressed={category === null} onClick={() => setCategory(null)}>{t("faqAll")}</button>
          {categories.map((name) => (
            <button key={name} type="button" className={forms.choice} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>
          ))}
        </div>
      ) : null}
      <div>
        {shown.map((faq) => (
          <details key={faq.id} className={styles.faq}>
            <summary><span>{faq.question}</span><Icon name="caret-down" size={16} tone="secondary" /></summary>
            {faq.answer ? <p className={styles.faqAnswer}>{faq.answer}</p> : null}
          </details>
        ))}
      </div>
    </div>
  );
}
