import { MOTION, reducedMotion } from "./motion";

/** The header cart icon of the page (the one cart button, components-next/core/cart-link.tsx). */
const CART_ICON = '[data-testid="cart-link"]';
const CART_BADGE = '[data-testid="cart-badge"]';

/** Scale 1 -> 1.2 -> 1 on the cart badge, once the new count is on screen. */
export function popCartBadge(): void {
  if (reducedMotion()) return;
  window.setTimeout(() => {
    document.querySelector<HTMLElement>(CART_BADGE)?.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.2)", offset: 0.5 }, { transform: "scale(1)" }],
      { duration: MOTION.pop, easing: MOTION.ease },
    );
  }, 60);
}

/**
 * A small copy of the product's image flies from its card to the header cart icon (MOTION.flight, ease-out) and the badge pops.
 * `from` is the button that was pressed; its card's picture is the one that flies. With reduced motion nothing flies and the
 * badge only changes its number. Never throws: the animation is a courtesy, the add has already happened.
 */
export function flyToCart(from: HTMLElement): void {
  if (reducedMotion()) return;
  try {
    const target = document.querySelector<HTMLElement>(CART_ICON);
    const picture = (from.closest("li, article") ?? from).querySelector<HTMLImageElement>("img");
    if (target && picture && picture.currentSrc) {
      const a = picture.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      if (a.width > 0 && b.width > 0) {
        const size = 56;
        const clone = document.createElement("img");
        clone.src = picture.currentSrc;
        clone.alt = "";
        clone.setAttribute("aria-hidden", "true");
        Object.assign(clone.style, {
          position: "fixed", insetBlockStart: "0", insetInlineStart: "0", inlineSize: `${size}px`, blockSize: `${size}px`, objectFit: "contain",
          borderRadius: "12px", pointerEvents: "none", zIndex: "1000", willChange: "transform, opacity",
        });
        document.body.appendChild(clone);
        const fromX = a.left + a.width / 2 - size / 2;
        const fromY = a.top + a.height / 2 - size / 2;
        const toX = b.left + b.width / 2 - size / 2;
        const toY = b.top + b.height / 2 - size / 2;
        const flight = clone.animate(
          [
            { transform: `translate(${fromX}px, ${fromY}px) scale(1)`, opacity: 1 },
            { transform: `translate(${toX}px, ${toY}px) scale(0.25)`, opacity: 0.4 },
          ],
          { duration: MOTION.flight, easing: MOTION.ease, fill: "forwards" },
        );
        flight.onfinish = () => clone.remove();
        flight.oncancel = () => clone.remove();
      }
    }
  } catch {
    /* a missing animation API: the add is done */
  }
  popCartBadge();
}
