// Reviewer-written acceptance tests (HANDOFF §2): outside the default test run
// until the item is approved. Run: npx vitest run --config vitest.acceptance.config.ts acceptance/<id>
import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

export default mergeConfig(base, defineConfig({ test: { include: ["acceptance/**/*.acceptance.test.ts"] } }));
