import { redirectToInsuranceHub } from "@/lib/insurance/redirect";

type Props = { params: Promise<{ locale: string }> };

/** Removed by owner decision 35 (2026-10-10): the claim refunds tab is gone (order and return refunds stay in orders and returns). Old links open the insurance hub. */
export default function InsuranceRefundsRedirect({ params }: Props) {
  return redirectToInsuranceHub(params);
}
