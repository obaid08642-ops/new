import { reduceMotion } from './motion';

export interface Point { x: number; y: number }
export interface Flight { id: number; uri?: string | null; from: Point }
export interface CartTarget { measure: (done: (x: number, y: number, width: number, height: number) => void) => void }

let target: CartTarget | null = null;
let seq = 0;
const listeners = new Set<(flight: Flight) => void>();

/** The header cart button says where it is (the thing a flight lands on); returns the way to forget it. */
export function registerCartTarget(next: CartTarget): () => void {
  target = next;
  return () => { if (target === next) target = null; };
}

/** The layer that draws flights listens here. */
export function subscribeFlights(listener: (flight: Flight) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Where the cart button is on screen (its centre), or null when this screen has none. */
export function measureCartTarget(): Promise<Point | null> {
  return new Promise((resolve) => {
    if (!target) { resolve(null); return; }
    target.measure((x, y, width, height) => resolve(width > 0 || height > 0 ? { x: x + width / 2, y: y + height / 2 } : null));
  });
}

/**
 * A small copy of the product's picture flies from where the finger was to the cart button. Nothing flies with reduced
 * motion, or when the screen has no cart button; the add itself is already done.
 */
export function flyToCart(from: Point, uri?: string | null): boolean {
  if (reduceMotion() || !target || listeners.size === 0) return false;
  const flight: Flight = { id: ++seq, uri, from };
  listeners.forEach((listener) => listener(flight));
  return true;
}
