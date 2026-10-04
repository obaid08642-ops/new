"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import styles from "./confirm-dialog.module.css";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      dialogRef.current?.showModal();
      document.body.style.overflow = "hidden";
      // Focus the cancel button by default (safer)
      setTimeout(() => {
        const cancelBtn = dialogRef.current?.querySelector<HTMLButtonElement>('[data-action="cancel"]');
        cancelBtn?.focus();
      }, 0);
    } else {
      dialogRef.current?.close();
      document.body.style.overflow = "";
      previousActiveElement.current?.focus();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const variantStyles = {
    danger: styles.variantDanger,
    warning: styles.variantWarning,
    info: styles.variantInfo,
  };

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ${variantStyles[variant]}`}
      onClose={onClose}
      onKeyDown={handleKeyDown}
    >
      <form method="dialog" className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button
            type="button"
            data-action="cancel"
            className={styles.cancel}
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-action="confirm"
            className={`${styles.confirm} ${styles[variant]}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </form>
      <div className={styles.backdrop} onClick={handleOverlayClick} />
    </dialog>
  );
}

export function useConfirmDialog() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void;
    onClose: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onClose: () => {},
  });

  const open = (options: {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
  }) => {
    setState({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel,
      cancelLabel: options.cancelLabel,
      variant: options.variant ?? "danger",
      onConfirm: options.onConfirm,
      onClose: () => setState((s) => ({ ...s, isOpen: false })),
    });
  };

  const close = () => setState((s) => ({ ...s, isOpen: false }));

  return {
    ...state,
    open,
    close,
  };
}