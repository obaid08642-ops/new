import { RevalidateStale } from "./revalidate-stale";

/**
 * Put once inside a public list page. Records when the server rendered the page; the client then revalidates the page
 * if the router cache served it some time after that (see RevalidateStale). Renders nothing.
 */
export function StaleWhileRevalidate() {
  return <RevalidateStale renderedAt={Date.now()} />;
}
