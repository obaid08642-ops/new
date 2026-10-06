import type { ServiceTone } from "@/components-next/ui-generated/icons/fill";

/**
 * The chip tone of a prescription state, from the service tones of the handoff (never a colour written here):
 * what still needs a pharmacist is amber, what is done is mint, the rest is blue.
 */
export function prescriptionStateTone(state: string | undefined): ServiceTone {
  switch (state) {
    case "UPLOADED_BY_PATIENT":
    case "SENT_TO_PHARMACY":
    case "PARTIALLY_EDITED":
      return "amber";
    case "VERIFIED_BY_PHARMACIST":
    case "APPROVED":
    case "DISPENSED":
      return "mint";
    default:
      return "blue";
  }
}
