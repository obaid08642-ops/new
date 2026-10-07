"use client";

import { useEffect, useState } from "react";
import styles from "./scroll-progress.module.css";

interface ScrollProgressProps {
  className?: string;
  color?: string;
  height?: number;
  excludeSelectors?: string[];
}

export function ScrollProgress({
  className = "",
  color,
  height = 3,
  excludeSelectors = ["header", "footer", "[data-skip-progress]"],
}: ScrollProgressProps) {
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const calculateProgress = () => {
      // Check if we should skip progress for this page
      const skipElement = document.querySelector(excludeSelectors.join(","));
      if (skipElement && skipElement.hasAttribute("data-skip-progress")) {
        setProgress(0);
        return;
      }

      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, scrollPercent)));
    };

    calculateProgress();
    window.addEventListener("scroll", calculateProgress, { passive: true });
    window.addEventListener("resize", calculateProgress);

    return () => {
      window.removeEventListener("scroll", calculateProgress);
      window.removeEventListener("resize", calculateProgress);
    };
  }, [excludeSelectors]);

  if (!mounted) return null;

  return (
    <div
      className={`${styles.container} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page scroll progress"
      style={{ height: `${height}px`, ...(color ? { "--progress-color": color } : {}) } as React.CSSProperties}
    >
      <div className={styles.bar} style={{ width: `${progress}%` }} />
    </div>
  );
}

export function ArticleScrollProgress({
  articleSelector = "article, [role='article'], .article-content",
  ...props
}: ScrollProgressProps & { articleSelector?: string }) {
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const calculateProgress = () => {
      const article = document.querySelector(articleSelector) as HTMLElement | null;
      if (!article) {
        setProgress(0);
        return;
      }

      const articleTop = article.getBoundingClientRect().top + window.scrollY;
      const articleHeight = article.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrollTop = window.scrollY;

      const start = articleTop - windowHeight;
      const end = articleTop + articleHeight;

      if (scrollTop <= start) {
        setProgress(0);
      } else if (scrollTop >= end) {
        setProgress(100);
      } else {
        const scrollPercent = ((scrollTop - start) / (end - start)) * 100;
        setProgress(Math.min(100, Math.max(0, scrollPercent)));
      }
    };

    calculateProgress();
    window.addEventListener("scroll", calculateProgress, { passive: true });
    window.addEventListener("resize", calculateProgress);

    return () => {
      window.removeEventListener("scroll", calculateProgress);
      window.removeEventListener("resize", calculateProgress);
    };
  }, [articleSelector]);

  if (!mounted) return null;

  return (
    <div
      className={`${styles.container} ${styles.article} ${props.className || ""}`}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Article reading progress"
      style={{ height: `${props.height || 3}px`, ...(props.color ? { "--progress-color": props.color } : {}) } as React.CSSProperties}
    >
      <div className={styles.bar} style={{ width: `${progress}%` }} />
    </div>
  );
}