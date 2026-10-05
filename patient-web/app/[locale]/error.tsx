"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { reportSegmentError } from "@/lib/error-report";
import { SegmentErrorFallback } from "@/components-next/segment-error-fallback";

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();

  // P15.5: every render crash is reported with the release before the
  // fallback paints, so the fallback itself is never a silent hole.
  useEffect(() => {
    reportSegmentError(error, { segment: "locale", locale });
  }, [error, locale]);

  // F7: the same shared fallback every per-section boundary renders, so the
  // locale boundary stays identical to them — try again, home, contact support
  // and the Next.js digest as `ref:`. It is the only fallback that carries the
  // contact-support action and the digest ref; the board state card
  // (components-next/core/route-state) has neither, so this boundary cannot be
  // routed through it without losing both.
  return <SegmentErrorFallback error={error} reset={reset} segment="locale" />;
}
