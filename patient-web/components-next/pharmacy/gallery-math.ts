/**
 * The arithmetic of the product gallery and its full-screen viewer (issue 1547), kept pure so it is tested on its own:
 * which slide a scroll position shows (RTL scrolls to negative offsets), what an arrow key means in each direction,
 * and the zoom: pinch, double-tap at a point, pan kept inside the picture, swipe down to close.
 *
 * The zoom is a CSS transform `translate(x, y) scale(s)` with its origin at the centre of the slide; every point below
 * is measured from that centre.
 */

export const MAX_SCALE = 4;
export const DOUBLE_TAP_SCALE = 2.5;
export const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 30;
const SWIPE_CLOSE_PX = 90;

export type Zoom = { scale: number; x: number; y: number };
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export const NO_ZOOM: Zoom = { scale: 1, x: 0, y: 0 };

export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** The slide a horizontal scroll container shows (`scrollLeft` is negative in a right-to-left container). */
export function slideIndex(scrollLeft: number, width: number, count: number): number {
  if (count <= 0 || width <= 0) return 0;
  return clamp(Math.round(Math.abs(scrollLeft) / width), 0, count - 1);
}

/** The `scrollLeft` that shows slide `index`. */
export function slideOffset(index: number, width: number, rtl: boolean): number {
  const offset = index * width;
  return rtl && offset !== 0 ? -offset : offset;
}

/** Whether an element lays out right to left (read when needed, so the gallery follows the page's own direction). */
export const isRtl = (el: Element) => getComputedStyle(el).direction === "rtl";

/** +1 for the next picture, -1 for the previous one, 0 for any other key; the arrows are mirrored right to left. */
export function arrowStep(key: string, rtl: boolean): -1 | 0 | 1 {
  if (key === "ArrowRight") return rtl ? -1 : 1;
  if (key === "ArrowLeft") return rtl ? 1 : -1;
  return 0;
}

/** Keeps the picture covering its slide: no pan at scale 1, at most the overflow on each side when zoomed. */
export function clampPan(zoom: Zoom, size: Size): Zoom {
  const scale = clamp(zoom.scale, 1, MAX_SCALE);
  const maxX = ((scale - 1) * size.width) / 2;
  const maxY = ((scale - 1) * size.height) / 2;
  return { scale, x: clamp(zoom.x, -maxX, maxX), y: clamp(zoom.y, -maxY, maxY) };
}

/** Zooms to `scale` keeping the picture's point under `at` where it is (a pinch's centre, a double tap). */
export function zoomAt(zoom: Zoom, scale: number, at: Point, size: Size): Zoom {
  const next = clamp(scale, 1, MAX_SCALE);
  const ratio = next / zoom.scale;
  return clampPan({ scale: next, x: at.x - (at.x - zoom.x) * ratio, y: at.y - (at.y - zoom.y) * ratio }, size);
}

/** A double tap zooms in at the tapped point, or back out when the picture is already zoomed. */
export function toggleZoom(zoom: Zoom, at: Point, size: Size): Zoom {
  return zoom.scale > 1 ? NO_ZOOM : zoomAt(zoom, DOUBLE_TAP_SCALE, at, size);
}

/** The scale a pinch reached: the scale at its start times how far the fingers spread. */
export function pinchScale(startScale: number, startDistance: number, distance: number): number {
  if (startDistance <= 0) return startScale;
  return clamp((startScale * distance) / startDistance, 1, MAX_SCALE);
}

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Two taps close in time and place. */
export function isDoubleTap(previous: { t: number; x: number; y: number } | null, current: { t: number; x: number; y: number }): boolean {
  return previous !== null && current.t - previous.t <= DOUBLE_TAP_MS && Math.hypot(current.x - previous.x, current.y - previous.y) <= DOUBLE_TAP_SLOP;
}

/** A drag that went down far enough, and mostly down, closes the viewer (touch only, picture not zoomed). */
export function isSwipeDown(dx: number, dy: number): boolean {
  return dy >= SWIPE_CLOSE_PX && dy > Math.abs(dx) * 1.5;
}
