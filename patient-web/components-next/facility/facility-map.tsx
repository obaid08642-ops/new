"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { webglAvailable } from "@/lib/geo/map";

// MapLibre (~800 KB) is loaded only when this map is drawn, and only in the browser (tests/address-map-lazy.test.ts)
const MapCanvas = dynamic(() => import("@/components-next/account/address-map/map-canvas"), { ssr: false });

/** The facility's pin on a map the visitor looks at (it does not move). Without WebGL or the map style it draws nothing: the address and directions stay. */
export function FacilityMap({ lat, lng, label, hint, pinLabel }: { lat: number; lng: number; label: string; hint?: string; pinLabel: string }) {
  const [unavailable, setUnavailable] = useState(false);
  if (unavailable || (typeof document !== "undefined" && !webglAvailable())) return null;
  return (
    <MapCanvas initial={{ lat, lng }} focus={null} fixed zoom={15} onMoveEnd={() => {}} onUnavailable={() => setUnavailable(true)} label={label} hint={hint ?? ""} zoomIn="" zoomOut="" pinLabel={pinLabel} />
  );
}
