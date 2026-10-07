"use client";

import styles from "./skip-link.module.css";

interface SkipLinkProps {
  targetId?: string;
  label?: string;
  className?: string;
}

export function SkipLink({ targetId = "main-content", label = "Skip to main content", className = "" }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={`${styles.skipLink} ${className}`}
    >
      {label}
    </a>
  );
}

export function MainContent({ id = "main-content", children, className = "" }: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main id={id} className={`${styles.mainContent} ${className}`} tabIndex={-1}>
      {children}
    </main>
  );
}