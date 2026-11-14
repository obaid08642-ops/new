"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components-next/ui-generated/components/Button";
import styles from "./confirm-dialog.module.css";

/** Tab and Shift+Tab stay on the dialog's buttons: the page behind the backdrop is not reachable from the keyboard. */
function keepFocusInside(event: KeyboardEvent, dialog: HTMLElement | null) {
  const buttons = Array.from(dialog?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
  if (buttons.length === 0) return;
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * The one confirm dialog for an action the patient cannot take back (a native confirm() is not styled, not translated by
 * the site and cannot be reached the same way on every device). The cancel button has the focus when it opens; Escape
 * cancels; the focus goes back to the control that opened it when it closes. The confirm answer is the caller's.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef({ busy, onCancel });
  cancelRef.current = { busy, onCancel };

  // Focus in and out: keyed on `open` only, so a re-render never reads the focused dialog button as the opener.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => opener?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !cancelRef.current.busy) cancelRef.current.onCancel();
      if (event.key === "Tab") keepFocusInside(event, dialogRef.current);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.backdrop}>
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={body ? bodyId : undefined} className={styles.dialog}>
        <h2 id={titleId} className={styles.title}>{title}</h2>
        {body ? <p id={bodyId} className={styles.body}>{body}</p> : null}
        <div className={styles.actions}>
          <Button label={cancelLabel} variant="secondary" size="md" disabled={busy} onClick={onCancel} />
          <Button label={confirmLabel} variant={destructive ? "danger" : "primary"} size="md" loading={busy} onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
}
