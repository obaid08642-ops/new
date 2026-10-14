import type { ReactNode } from "react";
import { CoreShell } from "@/components-next/core/core-shell";
import type { Locale } from "@/lib/i18n";
import rx from "@/components-next/pharmacy/rx.module.css";

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
  children,
}: {
  locale: Locale;
  title: string;
  backHref?: string;
  width?: "wide" | "narrow";
  footer?: ReactNode;
  hideTabs?: boolean;
  children: ReactNode;
}) {
  return (
    <CoreShell locale={locale} title={title} backHref={backHref} width={width} footer={footer} hideTabs={hideTabs}>
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{title}</h1></div>
        {children}
      </div>
    </CoreShell>
  );
}
