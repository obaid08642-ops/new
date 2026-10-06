"use client";

import { useRouter } from "next/navigation";
import { ErrorState } from "@/components-next/ui-generated/components/Feedback";

/** The board's error state (canvas/States) with a retry that reloads the page's server data. */
export function RetryErrorState({ title, body, retryLabel }: { title: string; body?: string; retryLabel: string }) {
  const router = useRouter();
  return <ErrorState title={title} body={body} retryLabel={retryLabel} onRetry={() => router.refresh()} />;
}

/**
 * The same error state with a retry that loads the address again (F82-3: the page the nonce server answers with, as 503,
 * when a static public page could not be made and has no cached copy). The address is the page's own, so a reload asks
 * for the real page again.
 */
export function ReloadErrorState({ title, body, retryLabel }: { title: string; body?: string; retryLabel: string }) {
  return <ErrorState title={title} body={body} retryLabel={retryLabel} onRetry={() => window.location.reload()} />;
}
