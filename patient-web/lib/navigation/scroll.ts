// 17.1 navigation: the scroll rules of the back-to-top button and the article reading bar, kept apart from React so
// they are tested without a browser (tests/navigation-17-1.test.tsx).

/** The back-to-top button appears once the page is scrolled this far (px). */
export const BACK_TO_TOP_AFTER_PX = 600;

export function showBackToTop(scrollY: number): boolean {
  return scrollY > BACK_TO_TOP_AFTER_PX;
}

/**
 * How far through the article the reader is, from 0 to 1: the scrolled distance over the distance that can be scrolled.
 * A page that fits on screen has nothing to scroll, so it reads 0 (the bar stays empty) rather than dividing by zero.
 */
export function readingRatio(scrollY: number, scrollHeight: number, viewportHeight: number): number {
  const scrollable = scrollHeight - viewportHeight;
  if (!(scrollable > 0)) return 0;
  return Math.min(1, Math.max(0, scrollY / scrollable));
}
