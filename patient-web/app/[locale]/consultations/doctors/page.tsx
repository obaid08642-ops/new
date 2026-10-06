import type { Metadata } from "next";
import { DoctorsView, doctorsMetadata } from "./doctors-view";

// F82-3: static/ISR. The list without a query is the same for everyone; a request with a search, a specialty or a sort is
// answered by the dynamic twin under /q (proxy.ts, lib/security/query-twin.ts). Generated on the first request, kept for
// the data window (the unfiltered list is read with the same 60 s), regenerated in the background. Next needs a literal
// here: DOCTORS_REVALIDATE_SECONDS in the view is the same number (tests/static-public-pages.test.ts pins it).
export const revalidate = 60;
export function generateStaticParams() {
  return [];
}

export function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return doctorsMetadata(props);
}

export default function DoctorsPage({ params }: { params: Promise<{ locale: string }> }) {
  return DoctorsView({ params });
}
