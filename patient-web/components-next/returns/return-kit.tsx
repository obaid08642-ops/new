import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import type { ServiceTone } from "@/components-next/ui-generated/icons/fill";

/** The states a return request has in the backend (processing, approved, completed, rejected); any other value reads "other". */
export const RETURN_STATUSES = ["processing", "approved", "completed", "rejected"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number] | "other";

export function returnStatus(raw: string | undefined): ReturnStatus {
  const value = (raw ?? "").toLowerCase();
  return (RETURN_STATUSES as readonly string[]).includes(value) ? (value as ReturnStatus) : "other";
}

const TONES: Record<ReturnStatus, ServiceTone> = {
  processing: OFFER_TONES.warn,
  approved: OFFER_TONES.info,
  completed: OFFER_TONES.good,
  rejected: "ink",
  other: "ink",
};

/** The status chip of a return request; `label` is the translated name of `status`. */
export function ReturnStatusChip({ status, label }: { status: ReturnStatus; label: string }) {
  return <StatusChip label={label} tone={TONES[status]} />;
}
