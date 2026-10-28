import type { ReactNode } from "react";

/**
 * The shell of a GET-form search field. Without `submitLabel` it is the old label wrapping icon and input.
 * With it the icon is a real submit button (a button inside a label would take the label away from the input),
 * and the input keeps its label through htmlFor.
 */
export function SuggestField({ id, className, label, submitLabel, submitClassName, icon, children }: {
  id: string; className: string; label: string; submitLabel?: string; submitClassName?: string; icon?: ReactNode; children: ReactNode;
}) {
  if (!submitLabel) {
    return (
      <label className={className}>
        {icon}
        <span className="sr-only">{label}</span>
        {children}
      </label>
    );
  }
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <button type="submit" className={submitClassName} aria-label={submitLabel}>{icon}</button>
      {children}
    </div>
  );
}
