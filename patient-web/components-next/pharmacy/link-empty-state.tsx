"use client";

import { useRouter } from "next/navigation";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";

/** The board's empty state (canvas/States) with its two actions as page links, for the server-rendered screens. */
export function LinkEmptyState({
  icon,
  tone,
  title,
  body,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
}: {
  icon: FillIconName;
  tone: ServiceTone;
  title: string;
  body?: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  const router = useRouter();
  return (
    <EmptyState
      icon={icon}
      tone={tone}
      title={title}
      body={body}
      actionLabel={actionLabel}
      onAction={actionHref ? () => router.push(actionHref) : undefined}
      secondaryActionLabel={secondaryLabel}
      onSecondaryAction={secondaryHref ? () => router.push(secondaryHref) : undefined}
    />
  );
}
