import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs script, no declarations
import { startPlan } from "../scripts/start-production.mjs";

describe("pnpm start runs the nonce server", () => {
  it("is the start script (plain `next start` serves public pages whose scripts the CSP refuses)", () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts.start).toBe("node scripts/start-production.mjs");
  });

  it("copies the build assets next to the standalone server and starts server/nonce-server.mjs", () => {
    const plan = startPlan("/app", ["-p", "3100"], { HOSTNAME: "127.0.0.1" });
    expect(plan.entry).toBe("/app/.next/standalone/server/nonce-server.mjs");
    expect(plan.copies.map(([from, to]: [string, string]) => [from, to])).toEqual([
      ["/app/.next/static", "/app/.next/standalone/.next/static"],
      ["/app/public", "/app/.next/standalone/public"],
      ["/app/server", "/app/.next/standalone/server"],
    ]);
    expect(plan.env).toMatchObject({ NODE_ENV: "production", PORT: "3100", HOSTNAME: "127.0.0.1" });
  });

  it("takes the port from PORT, else 3000", () => {
    expect(startPlan("/app", [], { PORT: "4000" }).env.PORT).toBe("4000");
    expect(startPlan("/app", [], {}).env.PORT).toBe("3000");
  });
});
