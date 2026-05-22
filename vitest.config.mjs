import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '9router', 'repos', 'dist'],
    globals: true,
    environment: 'node',
  },
});
