import path from "node:path";

// Plain object (no `vitest/config` import) so the file loads wherever vitest is installed.
export default {
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], globals: false },
};
