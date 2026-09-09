"use client";

import { useState } from "react";

export function OnboardingCarousel({ slides, locale }: { slides: { title: string; body: string }[]; locale: string }) {
  const ar = locale === "ar";
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0];
  if (!slide) return null;
  return (
    <section aria-label={ar ? "تعريف بالتطبيق" : "App intro"} aria-roledescription="carousel">
      <h2>{slide.title}</h2>
      <p>{slide.body}</p>
      <div style={{ display: "flex", gap: 8 }} role="tablist" aria-label={ar ? "الشرائح" : "Slides"}>
        {slides.map((s, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === index} aria-label={`${i + 1}`} onClick={() => setIndex(i)}>
            {i === index ? "●" : "○"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>{ar ? "السابق" : "Previous"}</button>
        <button type="button" onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))} disabled={index === slides.length - 1}>{ar ? "التالي" : "Next"}</button>
      </div>
    </section>
  );
}
