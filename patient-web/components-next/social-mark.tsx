import { APPLE_PATH, APPLE_VIEWBOX, GOOGLE_G_PARTS, GOOGLE_G_VIEWBOX, SNAPCHAT_GHOST, type SocialBrand } from "@/components-next/ui-generated/icons/social-brands";
import { BRAND_SNAPCHAT_PATH, BRAND_SNAPCHAT_VIEWBOX, BRAND_X_PATH, BRAND_X_VIEWBOX } from "@/components-next/ui-generated/icons/marks";

function sized(viewBox: string, height: number) {
  const [, , w, h] = viewBox.split(" ").map(Number);
  return { viewBox, width: (height * w) / h, height };
}

/** The full-colour brand mark of a "continue with" button. Decorative: the button carries the provider's name. */
export function SocialMark({ brand }: { brand: SocialBrand }) {
  const common = { "aria-hidden": true as const, focusable: false as const };
  if (brand === "google") return <svg {...common} {...sized(GOOGLE_G_VIEWBOX, 20)}>{GOOGLE_G_PARTS.map((part) => <path key={part.fill} d={part.path} fill={part.fill} />)}</svg>;
  if (brand === "apple") return <svg {...common} {...sized(APPLE_VIEWBOX, 20)}><path d={APPLE_PATH} fill="currentColor" /></svg>;
  if (brand === "snapchat") return <svg {...common} {...sized(BRAND_SNAPCHAT_VIEWBOX, 20)}><path d={BRAND_SNAPCHAT_PATH} fill={SNAPCHAT_GHOST.fill} stroke={SNAPCHAT_GHOST.stroke} strokeWidth={14} strokeLinejoin="round" /></svg>;
  return <svg {...common} {...sized(BRAND_X_VIEWBOX, 20)}><path d={BRAND_X_PATH} fill="currentColor" /></svg>;
}
