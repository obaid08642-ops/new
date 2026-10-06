"use client";

import { useRouter } from "next/navigation";
import { ErrorState } from "@/components-next/ui-generated/components/Feedback";

/** The board's error state (canvas/States) with a retry that re-reads the page's server data and a way out to another page. */
export function RetryLinkErrorState({ title, body, retryLabel, actionLabel, actionHref }: { title: string; body?: string; retryLabel: string; actionLabel?: string; actionHref?: string }) {
  const router = useRouter();
  return (
    <ErrorState
      title={title}
      body={body}
      retryLabel={retryLabel}
      onRetry={() => router.refresh()}
      actionLabel={actionHref ? actionLabel : undefined}
      onAction={actionHref ? () => router.push(actionHref) : undefined}
    />
  );
}
