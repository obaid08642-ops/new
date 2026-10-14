import { RevalidateStale } from "./revalidate-stale";

/**
 * Put once inside a public list page. Records when the server rendered the page; the client then revalidates the page
 * if the router cache served it some time after that (see RevalidateStale). Renders nothing.
 *
 * F82-3: on a static/ISR page `Date.now()` is the time the page was GENERATED, not the time of the request, and Next keeps a
 * generated page for its `revalidate` window. Pass that window as `maxAgeSeconds`: a copy younger than the window is as fresh
 * as the server would give, so only an older one (served stale while Next regenerated it, or held by the browser's router
 * cache) is revalidated. Without it (a page rendered per request) the default of a few seconds applies.
 */
export function StaleWhileRevalidate({ maxAgeSeconds }: { maxAgeSeconds?: number }) {
  return <RevalidateStale renderedAt={Date.now()} maxAgeMs={maxAgeSeconds === undefined ? undefined : maxAgeSeconds * 1000} />;
}
