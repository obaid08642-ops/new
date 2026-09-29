import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": templateRoot,
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
      // The design system packages live outside this app, so tests resolve them
      // from the repository rather than from node_modules.
      "@nabd/design-tokens": path.resolve(templateRoot, "../packages/design-tokens/dist/ts/tokens.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "app/**/*.test.tsx", "app/**/*.spec.ts", "app/**/*.spec.tsx", "lib/**/*.test.ts", "lib/**/*.test.tsx", "lib/**/*.spec.ts", "lib/**/*.spec.tsx", "tests/**/*.test.ts", "tests/**/*.test.tsx", "tests/**/*.spec.ts", "tests/**/*.spec.tsx"],
    fileParallelism: process.env.RUN_SANDBOX_TESTS !== "true",
  },
});
