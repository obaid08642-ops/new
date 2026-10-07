"use client";

import { SegmentErrorFallback } from "@/components-next/segment-error-fallback";

export default function ProviderInfoError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SegmentErrorFallback error={error} reset={reset} segment="provider-info" />;
}
