"use client";

import { useRouter } from "next/navigation";
import { EmptyState, ErrorState } from "@/components-next/ui-generated/components/Feedback";
import { SERVICE_ICONS, type FillIconName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import rx from "@/components-next/pharmacy/rx.module.css";

const CONSULT = SERVICE_ICONS.consult;

type Common = { title: string; body?: string; actionLabel?: string; actionHref?: string };

/**
 * The board's states (canvas/States) for the consultation screens. An error retries by reloading the page's server
 * data and may carry a way out to another page; an empty state carries an optional action as a page link. The texts
 * are the caller's, from the message files.
 */
export function ConsultState(props: ({ kind: "error"; retryLabel: string } | { kind: "empty"; icon?: FillIconName; tone?: ServiceTone }) & Common) {
  const router = useRouter();
  const go = props.actionHref ? () => router.push(props.actionHref as string) : undefined;
  return (
    <div className={rx.state}>
      {props.kind === "error" ? (
        <ErrorState
          title={props.title}
          body={props.body}
          retryLabel={props.retryLabel}
          onRetry={() => router.refresh()}
          actionLabel={go ? props.actionLabel : undefined}
          onAction={go}
        />
      ) : (
        <div role="status">
          <EmptyState
            icon={props.icon ?? CONSULT.icon}
            tone={props.tone ?? CONSULT.tone}
            title={props.title}
            body={props.body}
            actionLabel={go ? props.actionLabel : undefined}
            onAction={go}
          />
        </div>
      )}
    </div>
  );
}
