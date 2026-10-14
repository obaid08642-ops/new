import { redirectToInsuranceHub } from "@/lib/insurance/redirect";

type Props = { params: Promise<{ locale: string }> };

/** Removed by owner decision 35 (2026-10-10): insurance claims are not a patient feature (the facility asks the insurer). Old links open the insurance hub. */
export default function InsuranceClaimsRedirect({ params }: Props) {
  return redirectToInsuranceHub(params);
}
