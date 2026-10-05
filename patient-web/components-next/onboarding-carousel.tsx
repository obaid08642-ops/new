"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, FIcon, type FillIconName, type ServiceTone } from "@/components-next/ui-generated";
import styles from "./auth/auth.module.css";

export type OnboardingSlide = { title: string; body: string; icon: FillIconName; tone: ServiceTone };

/** Onboarding intro: one slide at a time, the boards' tile + title + body, dots, next / skip. */
export function OnboardingCarousel({ slides, locale }: { slides: OnboardingSlide[]; locale: string }) {
  const ar = locale === "ar";
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0];
  if (!slide) return null;
  const last = index === slides.length - 1;
  return (
    <section className={styles.onboard} aria-label={ar ? "تعريف بالتطبيق" : "App intro"} aria-roledescription="carousel">
      <div className={styles.onboardArt} aria-hidden="true">
        <span className={styles.onboardTile}><FIcon icon={slide.icon} tone={slide.tone} chip="none" size={72} /></span>
      </div>
      <div className={styles.heading}>
        <h1 className={styles.title} aria-live="polite">{slide.title}</h1>
        <p className={styles.subtitle}>{slide.body}</p>
      </div>
      <div className={styles.dots} role="tablist" aria-label={ar ? "الشرائح" : "Slides"}>
        {slides.map((s, i) => (
          <button key={s.title} type="button" role="tab" aria-selected={i === index} aria-label={`${i + 1}`} className={`${styles.dot} ${i === index ? styles.dotOn : ""}`} onClick={() => setIndex(i)} />
        ))}
      </div>
      <div className={styles.actions}>
        {last ? (
          <Link href={`/${locale}/onboarding/language`} className={styles.fullLink}><Button variant="primary" size="lg" fullWidth label={ar ? "متابعة" : "Continue"} /></Link>
        ) : (
          <Button variant="primary" size="lg" fullWidth label={ar ? "التالي" : "Next"} onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))} />
        )}
        <p className={styles.foot}><Link className={styles.link} href={`/${locale}/welcome`}>{ar ? "تخطي" : "Skip"}</Link></p>
      </div>
    </section>
  );
}
