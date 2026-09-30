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
      // from the repository rather than from node_modules. Order matters: Vite
      // matches aliases by prefix, so the sub-path entries must precede the
      // bare `@nabd/ui` or they get rewritten to `Icon.tsx/icons/...`.
      "@nabd/design-tokens": path.resolve(templateRoot, "../packages/design-tokens/dist/ts/tokens.ts"),
      "@nabd/ui/icons/illustrated": path.resolve(templateRoot, "../packages/ui/icons/illustrated.ts"),
      "@nabd/ui/icons/illustrations": path.resolve(templateRoot, "../packages/ui/icons/illustrations.ts"),
      "@nabd/ui": path.resolve(templateRoot, "../packages/ui/src/Icon.tsx"),
      // @nabd/ui is a peer-dependency consumer, not a workspace with its own
      // install, so its `import 'react'` cannot resolve by walking up from
      // packages/. Point the peers at THIS app's copies, which is also what keeps
      // a single React in the graph — two copies would break hooks.
      react: path.resolve(templateRoot, "node_modules/react"),
      "react/jsx-runtime": path.resolve(templateRoot, "node_modules/react/jsx-runtime.js"),
      "react-dom": path.resolve(templateRoot, "node_modules/react-dom"),
      "react-dom/server": path.resolve(templateRoot, "node_modules/react-dom/server.js"),
      "@phosphor-icons/react": path.resolve(templateRoot, "node_modules/@phosphor-icons/react"),
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "app/**/*.test.tsx", "app/**/*.spec.ts", "app/**/*.spec.tsx", "lib/**/*.test.ts", "lib/**/*.test.tsx", "lib/**/*.spec.ts", "lib/**/*.spec.tsx", "tests/**/*.test.ts", "tests/**/*.test.tsx", "tests/**/*.spec.ts", "tests/**/*.spec.tsx"],
    fileParallelism: process.env.RUN_SANDBOX_TESTS !== "true",
  },
});
