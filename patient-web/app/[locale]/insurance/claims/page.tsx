import { redirectToInsuranceTab } from "@/lib/insurance/redirect";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Merge map 2, section 6: this page is now the claims tab of the insurance hub. */
export default function InsuranceClaimsRedirect({ params, searchParams }: Props) {
  return redirectToInsuranceTab(params, searchParams, "claims");
}
