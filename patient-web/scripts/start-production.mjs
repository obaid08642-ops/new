// `pnpm start`: the only supported way to run the production build. The static public pages are built with a placeholder
// script nonce; server/nonce-server.mjs stamps a fresh one on every response. Plain `next start` serves the placeholder with a
// different per-request nonce in the CSP header, so the browser refuses every script and the page never hydrates (QA, 2026-10-25).
//   pnpm start [-p <port>]          (PORT and HOSTNAME from the environment otherwise; defaults 3000 / 0.0.0.0)
import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** What has to sit inside `.next/standalone` before the nonce server can start (the same copy as the Dockerfile and CI). */
export function startPlan(root, argv = [], env = process.env) {
  const standalone = join(root, ".next", "standalone");
  const port = (() => {
    const at = argv.findIndex((a) => a === "-p" || a === "--port");
    return at >= 0 && argv[at + 1] ? argv[at + 1] : env.PORT || "3000";
  })();
  return {
    standalone,
    copies: [
      [join(root, ".next", "static"), join(standalone, ".next", "static")],
      [join(root, "public"), join(standalone, "public")],
      [join(root, "server"), join(standalone, "server")],
    ],
    entry: join(standalone, "server", "nonce-server.mjs"),
    env: { ...env, NODE_ENV: "production", PORT: String(port) },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const plan = startPlan(root, process.argv.slice(2));
  if (!existsSync(plan.standalone)) {
    console.error("patient-web: .next/standalone is missing. Run `pnpm build` first.");
    process.exit(1);
  }
  for (const [from, to] of plan.copies) if (existsSync(from)) cpSync(from, to, { recursive: true });
  const child = spawn(process.execPath, [plan.entry], { stdio: "inherit", env: plan.env });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("exit", (code) => process.exit(code ?? 1));
}
