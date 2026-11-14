import { MOTION } from "@/lib/motion/motion";
import styles from "./card-rotation.module.css";

/** Every 2.5 s the card shows its next picture. */
export const ROTATION_MS = 2500;

/** The picture after `index` (the last turns back to the first). */
export const nextIndex = (index: number, count: number) => (count > 0 ? (index + 1) % count : 0);

/** A card turns through its pictures only when it has more than one and the visitor has not asked for less motion. */
export const shouldRotate = (count: number, reduced: boolean) => count > 1 && !reduced;

export type Rotation = { setVisible(visible: boolean): void; stop(): void };

/**
 * Turns a card through its pictures: a second layer crossfades over the card's own picture (MOTION.fade), and small dots show
 * the place. Only the NEXT picture is loaded, and only just before it is shown. It runs only while the card is on screen and
 * pauses while the pointer or the focus is on the card. Loaded on demand by card-image-rotator.tsx, never with the page.
 */
export function startRotation(media: HTMLElement, srcs: string[]): Rotation | null {
  const base = media.querySelector<HTMLImageElement>("img");
  if (!base || srcs.length < 2) return null;
  const card = media.closest<HTMLElement>(".nabd-product-card") ?? media;

  const layer = document.createElement("img");
  layer.alt = "";
  layer.setAttribute("aria-hidden", "true");
  layer.className = styles.layer;
  base.after(layer);
  const dots = document.createElement("span");
  dots.className = styles.dots;
  dots.setAttribute("aria-hidden", "true");
  const marks = srcs.map(() => {
    const dot = document.createElement("span");
    dot.className = styles.dot;
    dots.appendChild(dot);
    return dot;
  });
  media.appendChild(dots);

  let index = 0;
  let visible = false;
  let hovered = false;
  let timer: number | undefined;
  let stopped = false;
  const mark = () => marks.forEach((dot, i) => dot.classList.toggle(styles.dotOn, i === index));
  mark();

  const show = (to: number) => {
    const loader = new Image();
    loader.onload = () => {
      if (stopped) return;
      layer.src = srcs[to];
      layer.classList.add(styles.visible);
      index = to;
      mark();
      window.setTimeout(() => {
        if (stopped) return;
        base.src = srcs[to];
        base.removeAttribute("srcset");
        layer.classList.remove(styles.visible);
      }, MOTION.fade);
    };
    loader.src = srcs[to];
  };
  const run = () => {
    window.clearInterval(timer);
    timer = undefined;
    if (visible && !hovered && !stopped) timer = window.setInterval(() => show(nextIndex(index, srcs.length)), ROTATION_MS);
  };
  const enter = () => { hovered = true; run(); };
  const leave = () => { hovered = false; run(); };
  card.addEventListener("pointerenter", enter);
  card.addEventListener("pointerleave", leave);
  card.addEventListener("focusin", enter);
  card.addEventListener("focusout", leave);

  return {
    setVisible(next) { visible = next; run(); },
    stop() {
      stopped = true;
      window.clearInterval(timer);
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointerleave", leave);
      card.removeEventListener("focusin", enter);
      card.removeEventListener("focusout", leave);
      layer.remove();
      dots.remove();
    },
  };
}
