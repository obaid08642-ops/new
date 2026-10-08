import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { pickRouteMessages } from "@/lib/i18n/client-messages";
import type { Locale } from "@/lib/i18n";

/**
 * F82-3: put in the layout of a route group whose client components read namespaces that no other page needs
 * (lib/i18n/client-messages.ts, ROUTE_GROUP_NAMESPACES). The root layout hands every page the base namespaces; this
 * hands the group the base ones plus its own, so they reach the browser only on the group's pages.
 */
export async function RouteMessages({ group, locale, children }: { group: string; locale: Locale; children: React.ReactNode }) {
  const messages = pickRouteMessages(await getMessages({ locale }), group);
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
