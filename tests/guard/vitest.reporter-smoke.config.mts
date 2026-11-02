import { defineConfig } from 'vitest/config'

// Same run settings as vitest.guard.config.mts, but only the database-free reporter fixture.
export default defineConfig({
  envDir: false,
  test: {
    environment: 'node',
    include: ['tests/guard/reporter-smoke.fixture.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    bail: 1,
    retry: 0,
    reporters:
      process.env.B5_SMOKE_MODE === 'no-results' ? ['dot'] : ['./tests/guard/safe-reporter.mjs'],
  },
})
