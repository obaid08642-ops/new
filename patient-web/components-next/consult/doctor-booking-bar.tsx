"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { StickyFooter } from "@/components-next/ui-generated/shells";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { barState, type BookSelection } from "@/lib/consult/doctor-summary";
import rx from "@/components-next/pharmacy/rx.module.css";
import own from "./doctor-schedule.module.css";

type Ctx = { selection: BookSelection | null; setSelection: (value: BookSelection | null) => void };
const SelectionContext = createContext<Ctx>({ selection: null, setSelection: () => undefined });

/** The one place the chosen time lives: the time chips set it, the sticky bar reads it. */
export function BookingSelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<BookSelection | null>(null);
  const value = useMemo(() => ({ selection, setSelection }), [selection]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}
export const useBookingSelection = () => useContext(SelectionContext);

/**
 * The sticky "Book" bar (shell `footer`): the chosen day, time and fee, and the button to the existing booking page.
 * Disabled with a hint until a time chip is chosen. The booking page reads only `service_type`, so the chosen day and
 * time are not carried (needs-review).
 */
export function StickyBookBar({ locale, bookHref, feeTexts, labels }: {
  locale: string; bookHref: string; feeTexts: Partial<Record<BookSelection["type"], string>>;
  labels: { region: string; book: string; choose: string };
}) {
  const { selection } = useBookingSelection();
  const state = barState(locale, selection, feeTexts);
  return (
    <StickyFooter label={labels.region}>
      <div className={`${rx.bar} ${own.bar}`}>
        <p className={state.enabled ? own.when : own.hint} aria-live="polite">{state.enabled ? state.label : labels.choose}</p>
        {state.enabled ? (
          <ButtonLink href={`${bookHref}?service_type=${state.type}`} label={labels.book} fullWidth />
        ) : (
          <button type="button" disabled aria-disabled="true" className="nabd-button nabd-button--primary nabd-button--lg nabd-button--full nabd-button--disabled">
            <span className="nabd-button__label">{labels.book}</span>
          </button>
        )}
      </div>
    </StickyFooter>
  );
}
