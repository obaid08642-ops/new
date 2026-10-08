"use client";

import { useId, type HTMLInputTypeAttribute } from "react";
import forms from "@/components-next/consult/consult.module.css";

/** A choice among a few values as pressable chips (the booking screens' pattern): the pressed one is `aria-pressed`. */
export function ChoiceGroup<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  const labelId = useId();
  return (
    <div className={forms.field}>
      <span className={forms.label} id={labelId}>{label}</span>
      <div className={forms.choices} role="group" aria-labelledby={labelId}>
        {options.map((option) => (
          <button key={option.value} type="button" className={forms.choice} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A labelled input on the design system's field style. Numbers and dates are always left-to-right. */
export function TextField({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  required = false,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: HTMLInputTypeAttribute;
  inputMode?: "numeric" | "decimal" | "text";
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  const ltr = type === "date" || inputMode === "numeric" || inputMode === "decimal";
  return (
    <label className={forms.field}>
      <span className={forms.label}>{label}</span>
      <input className={forms.control} type={type} value={value} onChange={(event) => onChange(event.target.value)} inputMode={inputMode} required={required} maxLength={maxLength} placeholder={placeholder} dir={ltr ? "ltr" : undefined} />
    </label>
  );
}
