"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import styles from "./back-to-top.module.css";

interface BackToTopProps {
  threshold?: number;
  className?: string;
  "aria-label"?: string;
}

export function BackToTop({
  threshold = 300,
  className = "",
  "aria-label": ariaLabel = "Back to top",
}: BackToTopProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!mounted) return null;

  return (
    <button
      type="button"
      className={`${styles.button} ${visible ? styles.visible : ""} ${className}`}
      onClick={scrollToTop}
      aria-label={ariaLabel}
      aria-hidden={!visible}
    >
      <ChevronUp size={20} aria-hidden="true" />
    </button>
  );
}