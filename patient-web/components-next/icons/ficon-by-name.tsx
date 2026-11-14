import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { FIconBaseProps } from "@/components-next/icons/ficon-types";
import { fillGlyph } from "@/components-next/ui-generated/icons/fill-all";
import type { FillAnyName } from "@/components-next/ui-generated/icons/fill";
import type { FIconRef } from "@/components-next/ui-generated/components/contract";

/**
 * <FIcon> for a glyph chosen by NAME at run time (a table row, a prop): it reads the full by-name record, so it is for SERVER
 * components only. A client component draws <FIcon icon glyph={FILL_X}> with the named outline it imports from icons/glyphs/<name>
 * (or receives the outline from the server): tests/fill-glyph-boundary.test.ts fails if a client module imports this file or
 * icons/fill-all.ts, because that would put every outline in its bundle.
 */
export function FIconByName({ icon, ...rest }: FIconBaseProps & { icon: FillAnyName }) {
  return <FIcon {...rest} {...({ icon, glyph: fillGlyph(icon) } as FIconRef)} />;
}
