"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, IconButton } from "@/components-next/ui-generated/components/Button";
import styles from "./health.module.css";

const SheetContext = createContext<{ close: () => void }>({ close: () => undefined });

/** The form inside a sheet asks the sheet to close when it has saved. */
export function useSheetClose(): () => void {
  return useContext(SheetContext).close;
}

/**
 * The sheet the health forms open in ("Add reading", "Add reminder", edit): the design system's modal frame
 * (ui-generated/components/css/Feedback.css, `variant="sheet"`: from the bottom on a phone) around the caller's form.
 * It opens from its button, or on load when the page was reached with the flag in the URL (`?add=1`, `?edit=<id>`);
 * Escape, the close button and the dimmed area close it, and focus goes in on open and back to the button on close.
 * Closing also drops the flag from the URL (`closeHref`), so a refresh does not reopen it.
 */
export function FormSheet({
  title,
  triggerLabel,
  closeLabel,
  defaultOpen = false,
  closeHref,
  triggerVariant = "primary",
  hideTrigger = false,
  children,
}: {
  title: string;
  triggerLabel: string;
  closeLabel: string;
  defaultOpen?: boolean;
  closeHref: string;
  triggerVariant?: "primary" | "outline" | "ghost";
  hideTrigger?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const titleId = useId();

  const close = useCallback(() => {
    setOpen(false);
    if (defaultOpen) router.replace(closeHref);
    triggerRef.current?.querySelector("button")?.focus();
  }, [closeHref, defaultOpen, router]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <SheetContext.Provider value={{ close }}>
      {hideTrigger ? null : <span ref={triggerRef}><Button label={triggerLabel} variant={triggerVariant} size="md" onClick={() => setOpen(true)} /></span>}
      {open ? (
        <div className="nabd-modal nabd-modal--sheet" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="nabd-modal__dialog">
            <div className={styles.sheetHead}>
              <h2 id={titleId} className={styles.sheetTitle}>{title}</h2>
              <IconButton name="close" label={closeLabel} variant="outlined" onClick={close} />
            </div>
            <div className={styles.sheetBody}>{children}</div>
          </div>
        </div>
      ) : null}
    </SheetContext.Provider>
  );
}
