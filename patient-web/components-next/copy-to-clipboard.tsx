"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { useToast } from "./toast";
import styles from "./copy-to-clipboard.module.css";

export interface CopyToClipboardProps {
  text: string;
  label?: string;
  successMessage?: string;
  errorMessage?: string;
  variant?: "button" | "icon" | "inline";
  className?: string;
  children?: React.ReactNode;
  "aria-label"?: string;
}

export function CopyToClipboard({
  text,
  label = "Copy",
  successMessage = "Copied to clipboard!",
  errorMessage = "Failed to copy",
  variant = "button",
  className = "",
  children,
  "aria-label": ariaLabel,
}: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      addToast({
        type: "success",
        title: successMessage,
        duration: 3000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({
        type: "error",
        title: errorMessage,
        duration: 3000,
      });
      setCopied(false);
    }
  }, [text, successMessage, errorMessage, addToast]);

  const copyLabel = copied ? "Copied!" : label;

  if (variant === "icon") {
    return (
      <button
        type="button"
        className={`${styles.iconButton} ${className}`}
        onClick={handleCopy}
        aria-label={ariaLabel || (copied ? "Copied to clipboard" : "Copy to clipboard")}
        aria-pressed={copied}
      >
        {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        <span className={styles.visuallyHidden}>{copyLabel}</span>
      </button>
    );
  }

  if (variant === "inline") {
    return (
      <span className={`${styles.inline} ${className}`}>
        {children || (
          <button
            type="button"
            className={styles.inlineButton}
            onClick={handleCopy}
            aria-label={ariaLabel || (copied ? "Copied to clipboard" : "Copy to clipboard")}
            aria-pressed={copied}
          >
            <Copy size={14} aria-hidden="true" />
            <span>{copyLabel}</span>
            {copied && <Check size={14} aria-hidden="true" className={styles.checkIcon} />}
          </button>
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.button} ${className} ${copied ? styles.copied : ""}`}
      onClick={handleCopy}
      aria-label={ariaLabel || (copied ? "Copied to clipboard" : "Copy to clipboard")}
      aria-pressed={copied}
    >
      <Copy size={16} aria-hidden="true" />
      <span>{copyLabel}</span>
      {copied && <Check size={16} aria-hidden="true" className={styles.checkIcon} />}
    </button>
  );
}

export function CopyableField({
  value,
  label,
  placeholder = "Click to copy",
  variant = "button",
}: {
  value: string;
  label?: string;
  placeholder?: string;
  variant?: "button" | "icon" | "inline";
}) {
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      addToast({
        type: "success",
        title: "Copied!",
        message: label ? `${label} copied to clipboard` : "Value copied to clipboard",
        duration: 3000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({
        type: "error",
        title: "Failed to copy",
        duration: 3000,
      });
    }
  };

  return (
    <div className={styles.copyableField}>
      {label && <span className={styles.fieldLabel}>{label}</span>}
      <div className={`${styles.fieldValue} ${copied ? styles.fieldCopied : ""}`}>
        <code className={styles.code}>{value || placeholder}</code>
        <CopyToClipboard
          text={value}
          variant={variant}
          successMessage={label ? `${label} copied!` : "Copied!"}
        />
      </div>
    </div>
  );
}