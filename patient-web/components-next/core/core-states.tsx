"use client";

import { useRouter } from "next/navigation";
import { ErrorState } from "@/components-next/ui-generated";

/** The board's error state (canvas/States) with a retry that reloads the page's server data. */
export function RetryErrorState({ title, body, retryLabel }: { title: string; body?: string; retryLabel: string }) {
  const router = useRouter();
  return <ErrorState title={title} body={body} retryLabel={retryLabel} onRetry={() => router.refresh()} />;
}
