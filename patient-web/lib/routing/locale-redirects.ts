import { locales } from "../i18n";

type Redirect = { source: string; destination: string; permanent: boolean };

/**
 * The old-address redirects are written as "/:locale/<old path>". A bare ":locale" matches any first segment, so
 * "/:locale/family/join" also caught the website's own POST /api/family/join and sent it to a page (307): joining a
 * family from the website never reached the server. Every redirect's ":locale" only matches a real locale.
 */
export function localeOnlyRedirects(rows: Redirect[]): Redirect[] {
  const locale = `:locale(${locales.join("|")})`;
  return rows.map((row) => (row.source.startsWith("/:locale/") ? { ...row, source: `/${locale}/${row.source.slice("/:locale/".length)}` } : row));
}
