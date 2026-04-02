import { defineConfig } from 'vitest/config';
import { join } from 'path';
import { tmpdir } from 'os';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
    testTimeout: 15000,
    env: {
      SWITCHBOARD_STORE_PATH: join(tmpdir(), 'switchboard-vitest-store.json'),
    },
  },
});
