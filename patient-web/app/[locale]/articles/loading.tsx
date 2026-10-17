import { RouteSkeleton } from "@/components-next/route-skeleton";

/**
 * Issue 1548: a navigation into this public section shows its skeleton at once, instead of the old page frozen until the
 * next one arrives. It is only the client-side transition: a visit served from the static/ISR copy gets the full HTML.
 */
export default function Loading() { return <RouteSkeleton rows={4} />; }
