import { describe, expect, it } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { PublicDataUnavailableError } from "../api/public-unavailable";
import { onRequestError } from "./request-error";

describe("with the real Sentry SDK", () => {
  it("the event of a public-data outage reaches Sentry as a warning (the real SDK keeps the scope level)", async () => {
    const events: Array<{ level?: string; fingerprint?: string[]; tags?: Record<string, unknown> }> = [];
    Sentry.init({ dsn: "https://public@example.invalid/1", beforeSend: (e) => { events.push(e as never); return null; }, tracesSampleRate: 0 });
    await onRequestError(new PublicDataUnavailableError("product"), { path: "/ar/p/x", method: "GET", headers: {} } as never, { routerKind: "App Router", routePath: "/[locale]/p/[slug]", routeType: "render", routerPath: "/[locale]/p/[slug]" } as never);
    await Sentry.flush(1000);
    expect(events).toHaveLength(1);
    expect(events[0].level).toBe("warning");
    expect(events[0].fingerprint).toEqual(["public-data-unavailable", "product"]);
  });
});
