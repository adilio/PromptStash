import { defineConfig } from 'vitest/config';

// Rules tests talk to the Firestore emulator, so they run in their own config
// and their own project id — `npm run test:rules` wraps this in
// `firebase emulators:exec`. The default `npm test` run stays offline and
// excludes tests/ entirely (see vite.config.ts).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    // One emulator, one shared ruleset: parallel suites would race on the same
    // project's data.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
