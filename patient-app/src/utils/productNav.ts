/**
 * Holds the currently visible catalogue list so the product page can offer
 * swipe-to-next/previous navigation without serialising hundreds of ids into
 * the route params. Set by the pharmacy grid on every render, read by the
 * product detail screen.
 */
let currentIds: string[] = [];

export function setVisibleProductIds(ids: string[]) {
  currentIds = ids;
}

export function getVisibleProductIds(): string[] {
  return currentIds;
}
