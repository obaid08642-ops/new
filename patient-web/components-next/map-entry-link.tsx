import Link from "next/link";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { mapEntryHref } from "@/lib/map/entry";
import type { MapProviderType } from "@/lib/map/book-href";
import styles from "./map-explorer.module.css";

/**
 * The entry to the providers map (/map) from the provider lists: a shared outline button with the map icon, opening the
 * map filtered to one kind of provider (`?type=`). `label` is HomeWeb.svcMap, read by the page.
 */
export function MapEntryLink({ locale, type, label }: { locale: string; type?: MapProviderType; label: string }) {
  return (
    <div className={styles.entryRow}>
      <Link href={mapEntryHref(locale, type)} className="nabd-button nabd-button--outline nabd-button--sm" data-map-entry={type ?? "all"}>
        <FIcon icon="map-trifold" tone="amber" chip="none" size={18} />
        <span className="nabd-button__label">{label}</span>
      </Link>
    </div>
  );
}
