import { defineConfig } from 'vitest/config'

// Guarded-migration integration tests: a disposable database owned by a non-superuser role,
// given explicitly in MIGRATION_GUARD_TEST_URL. Never the review test database or the live one.
export default defineConfig({
  envDir: false,
  test: {
    environment: 'node',
    include: ['tests/guard/**/*.spec.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    bail: 1,
    retry: 0,
    reporters: ['./tests/guard/safe-reporter.mjs'],
    testTimeout: 240_000,
    hookTimeout: 60_000,
  },
})
