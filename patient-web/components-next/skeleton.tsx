"use client";

import styles from "./skeleton.module.css";

interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "card" | "avatar" | "button" | "input";
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
  "aria-label"?: string;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  lines = 1,
  className = "",
  "aria-label": ariaLabel = "Loading content",
}: SkeletonProps) {
  const baseStyles = [styles.skeleton, styles[variant], className].filter(Boolean).join(" ");

  const inlineStyles: React.CSSProperties = {};
  if (width) inlineStyles.width = typeof width === "number" ? `${width}px` : width;
  if (height) inlineStyles.height = typeof height === "number" ? `${height}px` : height;

  if (variant === "text" && lines > 1) {
    return (
      <div className={baseStyles} style={inlineStyles} aria-label={ariaLabel} aria-busy="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={styles.line} style={{ width: i === lines - 1 ? "70%" : "100%" }} />
        ))}
      </div>
    );
  }

  return (
    <div className={baseStyles} style={inlineStyles} aria-label={ariaLabel} aria-busy="true" />
  );
}

export function CardSkeleton({ lines = 3, image = true, actions = true, className = "" }: {
  lines?: number;
  image?: boolean;
  actions?: boolean;
  className?: string;
}) {
  return (
    <div className={`${styles.card} ${className}`} aria-label="Loading card" aria-busy="true">
      {image && <div className={styles.cardImage} />}
      <div className={styles.cardContent}>
        <Skeleton variant="text" width="60%" className={styles.cardTitle} />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} variant="text" width={i === lines - 1 ? "75%" : "100%"} className={styles.cardLine} />
        ))}
        {actions && <div className={styles.cardActions}><Skeleton variant="button" /><Skeleton variant="button" /></div>}
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5, ...props }: { items?: number } & Omit<SkeletonProps, "variant">) {
  return (
    <div className={styles.list} aria-label="Loading list" aria-busy="true">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className={styles.listItem}>
          <CardSkeleton {...props} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className={styles.table} aria-label="Loading table" aria-busy="true">
      <div className={styles.tableHeader}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width="80%" height="1rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className={styles.tableRow}>
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton key={col} variant="text" width="90%" height="1rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <main className={styles.page} aria-label="Loading page" aria-busy="true">
      <header className={styles.pageHeader}>
        <Skeleton variant="text" width="30%" height="2rem" />
        <Skeleton variant="text" width="50%" height="1rem" />
      </header>
      {Array.from({ length: sections }).map((_, i) => (
        <section key={i} className={styles.pageSection}>
          <Skeleton variant="text" width="40%" height="1.5rem" className={styles.sectionTitle} />
          <CardSkeleton lines={2} />
        </section>
      ))}
    </main>
  );
}

export function DashboardSkeleton() {
  return (
    <div className={styles.dashboard} aria-label="Loading dashboard" aria-busy="true">
      <div className={styles.dashboardHeader}>
        <Skeleton variant="text" width="40%" height="2rem" />
        <Skeleton variant="button" width="120px" />
      </div>
      <div className={styles.statsGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.statCard}>
            <Skeleton variant="text" width="60%" height="0.875rem" />
            <Skeleton variant="text" width="100%" height="2rem" className={styles.statValue} />
            <Skeleton variant="text" width="80%" height="0.875rem" />
          </div>
        ))}
      </div>
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <Skeleton variant="text" width="50%" height="1.25rem" />
          <div className={styles.chartArea}><Skeleton variant="rectangular" height="200px" /></div>
        </div>
        <div className={styles.chartCard}>
          <Skeleton variant="text" width="50%" height="1.25rem" />
          <div className={styles.chartArea}><Skeleton variant="rectangular" height="200px" /></div>
        </div>
      </div>
    </div>
  );
}