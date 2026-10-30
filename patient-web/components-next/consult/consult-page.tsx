import type { ReactNode } from "react";
import { CoreShell } from "@/components-next/core/core-shell";
import type { Locale } from "@/lib/i18n";
import rx from "@/components-next/pharmacy/rx.module.css";
import { MapEntryLink } from "@/components-next/map-entry-link";
import type { MapProviderType } from "@/lib/map/book-href";
import { Breadcrumbs, type Crumb } from "@/components-next/navigation/breadcrumbs";

/**
 * The frame of every consultation screen: the shell (top bar, tab bar), the phone header with the title and a back
 * button, and the page's own h1 from 768 (the same frame as the order and pharmacy screens). A page with a sticky
 * bottom bar passes it as `footer`.
 */
export function ConsultPage({
  locale,
  title,
  backHref,
  width = "narrow",
  footer,
  hideTabs = false,
  crumbs,
  crumbsLabel,
  mapType,
  mapLabel,
  resultsHref,
  children,
}: {
  locale: Locale;
  title: string;
  backHref?: string;
  width?: "wide" | "narrow";
  footer?: ReactNode;
  hideTabs?: boolean;
  /** 17.1: the visible trail above the title (Home › Section › Page), with the nav's accessible name. */
  crumbs?: Crumb[];
  crumbsLabel?: string;
  /** A provider list passes its kind: a "Map" button opens /map filtered to it. */
  mapType?: MapProviderType;
  /** HomeWeb.svcMap, read by the page (required with `mapType`). */
  mapLabel?: string;
  /** Labs and radiology: the header icon and the phone-menu entry "My orders and results". */
  resultsHref?: string;
  children: ReactNode;
}) {
  return (
    <CoreShell locale={locale} title={title} backHref={backHref} width={width} footer={footer} hideTabs={hideTabs} resultsHref={resultsHref}>
      <div className={rx.page}>
        {crumbs && crumbsLabel ? <Breadcrumbs label={crumbsLabel} items={crumbs} /> : null}
        <div className={rx.head}><h1 className={rx.title}>{title}</h1></div>
        {mapType && mapLabel ? <MapEntryLink locale={locale} type={mapType} label={mapLabel} /> : null}
        {children}
      </div>
    </CoreShell>
  );
}
