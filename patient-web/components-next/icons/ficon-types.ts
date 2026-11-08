import type { FIconProps } from "@/components-next/ui-generated/components/contract";

/** The props of <FIcon> without the icon: tone, size, chip, label, testID. */
export type FIconBaseProps = Omit<FIconProps, "icon" | "glyph">;
