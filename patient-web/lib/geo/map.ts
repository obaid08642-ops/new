/** The address map (MapLibre GL + OpenFreeMap, no key): the constants and the pure parts, kept out of the lazy component. */
import type { AddressPoint } from "@/lib/account/address-form";

/** OpenFreeMap "positron": a quiet light style, so the pin and the page tokens carry the colour. Hosts: tiles.openfreemap.org only. */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
/** Where the map opens before the patient has a pin: Riyadh. The pin is NOT set until the patient moves the map or shares a location. */
export const MAP_DEFAULT_CENTER: AddressPoint = { lat: 24.7136, lng: 46.6753 };
export const MAP_DEFAULT_ZOOM = 12;
/** A position fix is shown at street level. */
export const MAP_LOCATED_ZOOM = 16;
/** Arrow keys move the pin by this many screen pixels (the map moves under the fixed pin); Shift moves five times as far. */
export const NUDGE_PX = 40;

export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">&copy; OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';

export type NudgeAction = { kind: "pan"; dx: number; dy: number } | { kind: "zoom"; delta: 1 | -1 };

/**
 * A key on the focused map: arrows pan (the pin stays in the middle, the ground moves under it), + and - zoom. The map is
 * panned by the OPPOSITE of the pin's direction, so ArrowRight moves the pin to the right on screen in every language.
 */
export function nudgeFor(key: string, shift = false): NudgeAction | null {
  const step = shift ? NUDGE_PX * 5 : NUDGE_PX;
  switch (key) {
    case "ArrowLeft": return { kind: "pan", dx: -step, dy: 0 };
    case "ArrowRight": return { kind: "pan", dx: step, dy: 0 };
    case "ArrowUp": return { kind: "pan", dx: 0, dy: -step };
    case "ArrowDown": return { kind: "pan", dx: 0, dy: step };
    case "+": case "=": return { kind: "zoom", delta: 1 };
    case "-": case "_": return { kind: "zoom", delta: -1 };
    default: return null;
  }
}

/** Whether this browser can draw a WebGL map at all (MapLibre needs it); false on the server and without WebGL. */
export function webglAvailable(doc: Pick<Document, "createElement"> | undefined = typeof document === "undefined" ? undefined : document): boolean {
  if (!doc) return false;
  try {
    const canvas = doc.createElement("canvas") as HTMLCanvasElement;
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** A coordinate pair for the text alternative, e.g. "24.71360, 46.67530", digits in the page's language. */
export function formatPoint(point: AddressPoint, locale: string): string {
  let nf: Intl.NumberFormat;
  try { nf = new Intl.NumberFormat(locale, { minimumFractionDigits: 5, maximumFractionDigits: 5 }); } catch { nf = new Intl.NumberFormat("en", { minimumFractionDigits: 5, maximumFractionDigits: 5 }); }
  return `${nf.format(point.lat)}, ${nf.format(point.lng)}`;
}
