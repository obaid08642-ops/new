"use client";

import { useState, useRef, useEffect, forwardRef, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./password-toggle.module.css";

export interface PasswordToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
}

export const PasswordToggle = forwardRef<HTMLInputElement, PasswordToggleProps>(
  ({ label, placeholder, error, helperText, className, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputId = useRef(id || `password-${Math.random().toString(36).slice(2, 9)}`).current;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText && !error ? `${inputId}-helper` : undefined;

    const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

    return (
      <div className={`${styles.wrapper} ${className || ""} ${error ? styles.hasError : ""} ${isFocused ? styles.focused : ""}`}>
        {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
        <div className={styles.inputWrapper}>
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? "text" : "password"}
            placeholder={placeholder}
            className={styles.input}
            aria-describedby={describedBy}
            aria-invalid={error ? "true" : "false"}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoComplete="current-password"
            {...props}
          />
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setShowPassword((prev) => !prev)}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        </div>
        {error && <p id={errorId} className={styles.error} role="alert">{error}</p>}
        {helperText && !error && <p id={helperId} className={styles.helper}>{helperText}</p>}
      </div>
    );
  }
);

PasswordToggle.displayName = "PasswordToggle";