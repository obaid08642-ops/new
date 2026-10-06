import type { Metadata } from "next";
import { DoctorsView, doctorsMetadata, type DoctorsViewProps } from "@/app/[locale]/consultations/doctors/doctors-view";

/**
 * The dynamic twin of /consultations/doctors for a request that carries a search, a specialty or a sort (F82-3:
 * proxy.ts rewrites to it; the address does not change). Same view, reads `searchParams`, never cached, never indexed.
 */
export async function generateMetadata(props: Pick<DoctorsViewProps, "params">): Promise<Metadata> {
  return { ...(await doctorsMetadata(props)), robots: { index: false, follow: true } };
}

export default function DoctorsQueryPage(props: DoctorsViewProps) {
  return DoctorsView(props);
}
