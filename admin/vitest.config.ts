import path from 'node:path';

/**
 * Admin had no test runner before Phase 15. Vitest is the runner the other
 * Next.js app in this repo already uses (patient-web), so nothing new is
 * invented here. The config is a plain object (no `vitest/config` import) so it
 * also loads when the runner binary is resolved from elsewhere in the monorepo.
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
  },
};

export default config;
