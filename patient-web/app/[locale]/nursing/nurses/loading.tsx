import { RouteSkeleton } from "@/components-next/route-skeleton";

/** Owner decision 43 (issue 427): the skeleton of this section, which reads the patient's data; there is none at the root, so public pages paint their content at once. */
export default function Loading() { return <RouteSkeleton rows={4} />; }
