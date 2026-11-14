import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { FIconRef } from "@/components-next/ui-generated/components/contract";
import type { FIconBaseProps } from "@/components-next/icons/ficon-types";
import type { FillAnyName } from "@/components-next/ui-generated/icons/fill";

/**
 * <FIcon> for DATA that carries its glyph name and, for a glyph that is not a core one, the outline (`glyph`). Client-safe: it
 * imports no record of outlines. The server that builds the data adds the outline (fillGlyph in icons/fill-all, server only) or the
 * data module imports the named outline from icons/glyphs/<name>; FIcon throws outside production if a non-core name arrives without one.
 */
export function FIconGlyph({ icon, glyph, ...rest }: FIconBaseProps & { icon: FillAnyName; glyph?: string }) {
  return <FIcon {...rest} {...({ icon, glyph } as FIconRef)} />;
}
