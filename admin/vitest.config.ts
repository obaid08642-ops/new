import path from 'node:path';
import { findNodeTestSpecs } from './scripts/node-test-specs.mjs';

/**
 * Admin had no test runner before Phase 15. Vitest is the runner the other
 * Next.js app in this repo already uses (patient-web), so nothing new is
 * invented here. The config is a plain object (no `vitest/config` import) so it
 * also loads when the runner binary is resolved from elsewhere in the monorepo.
 *
 * `node:test` specs are excluded: vitest bridges `node:test`, so their
 * assertions run and pass, but its collector finds no `describe`/`it` and fails
 * the file as "No test suite found". `scripts/run-node-tests.mjs` runs exactly
 * that discovered set with jiti, the runner those specs' headers document, so
 * both styles are covered by `npm test`. Vitest's default excludes are kept.
 */
const config = {
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      ...findNodeTestSpecs().map((spec) => `**/${spec}`),
    ],
  },
};

export default config;
