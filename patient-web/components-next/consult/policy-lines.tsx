import type { ReactNode } from "react";
import { BulletList, SectionCard } from "@/components-next/consult/consult-parts";
import type { CancellationPolicy } from "@/lib/consult/cancellation-policy";

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** The three policy sentences built from the server's numbers, or one line saying the policy is not available. `c` is the ConsultWeb translator. */
export function policyLines(c: Translate, policy: CancellationPolicy | null): string[] {
  if (!policy) return [c("policyUnavailable")];
  const lines = [
    c("policyFull", { hours: policy.fullHours }),
    c("policyHalf", { half: policy.halfHours, full: policy.fullHours, percent: policy.halfPercent }),
  ];
  // The server's refund policy has no "nothing back" window: with no half-hours cut-off the late band runs to the visit.
  if (policy.halfHours > 0) lines.push(c("policyLess", { half: policy.halfHours }));
  return lines;
}

/** The cancellation and refund card. */
export function PolicyCard({ title, lines, children }: { title: string; lines: string[]; children?: ReactNode }) {
  return (
    <SectionCard id="cancel-policy" title={title}>
      <BulletList items={lines} />
      {children}
    </SectionCard>
  );
}
