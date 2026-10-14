"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { LinkButton } from "./link-button";
import styles from "./auth/auth.module.css";

export type OnboardingSlide = { title: string; body: string; icon: FillIconName; tone: ServiceTone };

/** Onboarding intro: one slide at a time, the boards' tile + title + body, dots, next / skip. */
export function OnboardingCarousel({ slides, locale }: { slides: OnboardingSlide[]; locale: string }) {
  const t = useTranslations("Onboarding");
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0];
  if (!slide) return null;
  const last = index === slides.length - 1;
  return (
    <section className={styles.onboard} aria-label={t("introLabel")} aria-roledescription="carousel">
      <div className={styles.onboardArt} aria-hidden="true">
        <span className={styles.onboardTile}><FIcon icon={slide.icon} tone={slide.tone} chip="none" size={72} /></span>
      </div>
      <div className={styles.heading}>
        <h1 className={styles.title} aria-live="polite">{slide.title}</h1>
        <p className={styles.subtitle}>{slide.body}</p>
      </div>
      <div className={styles.dots} role="tablist" aria-label={t("slidesLabel")}>
        {slides.map((s, i) => (
          <button key={s.title} type="button" role="tab" aria-selected={i === index} aria-label={`${i + 1}`} className={`${styles.dot} ${i === index ? styles.dotOn : ""}`} onClick={() => setIndex(i)} />
        ))}
      </div>
      <div className={styles.actions}>
        {last ? (
          <LinkButton href={`/${locale}/onboarding/language`} label={t("continue")} />
        ) : (
          <Button variant="primary" size="lg" fullWidth label={t("next")} onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))} />
        )}
        <p className={styles.foot}><Link className={styles.link} href={`/${locale}/welcome`}>{t("skip")}</Link></p>
      </div>
    </section>
  );
}
