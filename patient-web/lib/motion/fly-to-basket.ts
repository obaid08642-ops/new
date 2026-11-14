import { MOTION, reducedMotion } from "./motion";

/** The labs/radiology/nursing basket bar (components-next/ordering/basket-bar.tsx), which appears once the first line is in. */
const BASKET_BAR = '[data-testid="basket-bar"]';

/**
 * Labs, scans and nursing visits go into the ordering basket, not the pharmacy cart: a copy of the pressed "+" button flies to
 * the basket bar (MOTION.flight, ease-out) and the bar pops (scale 1 -> 1.06 -> 1, MOTION.pop). The bar is drawn only after the
 * add re-renders the page, so the target is looked up a moment later. With reduced motion nothing flies or pops; the count
 * still changes. Never throws: the animation is a courtesy, the add has already happened.
 */
export function flyToBasket(from: HTMLElement): void {
  if (reducedMotion()) return;
  window.setTimeout(() => {
    try {
      const target = document.querySelector<HTMLElement>(BASKET_BAR);
      if (!target) return;
      const a = from.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      if (a.width > 0 && b.width > 0) {
        const clone = from.cloneNode(true) as HTMLElement;
        clone.setAttribute("aria-hidden", "true");
        clone.removeAttribute("id");
        Object.assign(clone.style, {
          position: "fixed", insetBlockStart: "0", insetInlineStart: "0", inlineSize: `${a.width}px`, blockSize: `${a.height}px`,
          margin: "0", pointerEvents: "none", zIndex: "1000", willChange: "transform, opacity",
        });
        document.body.appendChild(clone);
        const toX = b.left + b.width / 2 - a.width / 2;
        const toY = b.top + b.height / 2 - a.height / 2;
        const flight = clone.animate(
          [
            { transform: `translate(${a.left}px, ${a.top}px) scale(1)`, opacity: 1 },
            { transform: `translate(${toX}px, ${toY}px) scale(0.3)`, opacity: 0.4 },
          ],
          { duration: MOTION.flight, easing: MOTION.ease, fill: "forwards" },
        );
        flight.onfinish = () => clone.remove();
        flight.oncancel = () => clone.remove();
      }
      target.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.06)", offset: 0.5 }, { transform: "scale(1)" }],
        { duration: MOTION.pop, easing: MOTION.ease },
      );
    } catch {
      /* a missing animation API: the add is done */
    }
  }, 60);
}
