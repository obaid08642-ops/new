import { redirectToInsuranceHub } from "@/lib/insurance/redirect";

type Props = { params: Promise<{ locale: string }> };

/** Removed by owner decision 35 (2026-10-10): patients no longer submit claims. Old links open the insurance hub. */
export default function InsuranceSubmitClaimRedirect({ params }: Props) {
  return redirectToInsuranceHub(params);
}
