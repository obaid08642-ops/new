"use client";

import { useTranslations } from "next-intl";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { ErrorState } from "@/components-next/ui-generated/components/Feedback";
import { Skeleton } from "@/components-next/ui-generated/components/Feedback";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import type { Coverage } from "@/lib/ordering/quote";
import styles from "./ordering.module.css";

const COVERAGE_TONE = { covered: DIAG_TONES.good, needs_approval: DIAG_TONES.warn, not_covered: DIAG_TONES.quiet } as const;
const COVERAGE_KEY = { covered: "covYes", needs_approval: "covLikely", not_covered: "covNo" } as const;

/** Per-item coverage as the quote states it (an estimate until approval). */
export function CoverageChip({ coverage }: { coverage: Coverage }) {
  const t = useTranslations("OrderingFlow");
  return <StatusChip label={t(COVERAGE_KEY[coverage])} tone={COVERAGE_TONE[coverage]} />;
}

export function QuoteLoading({ label }: { label: string }) {
  return (
    <div className={styles.stack} role="status" aria-label={label}>
      <p className={styles.sub}>{label}</p>
      <Skeleton variant="block" />
      <Skeleton variant="block" />
    </div>
  );
}

export function QuoteError({ errorKey, onRetry, titleKey = "errTitle" }: { errorKey: string; onRetry: () => void; titleKey?: string }) {
  const t = useTranslations("OrderingFlow");
  return <ErrorState title={t(titleKey)} body={t(errorKey)} retryLabel={t("retry")} onRetry={onRetry} />;
}
