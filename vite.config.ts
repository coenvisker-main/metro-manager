import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relatief pad: de build werkt op GitHub Pages (subpad /metro-manager/) en op elke andere host.
  base: './',
  plugins: [tailwindcss()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
