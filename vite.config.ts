import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // `--mode single`: alles (JS, CSS, lettertype) in één HTML-bestand dat je zonder server of
  // installatie kunt openen met dubbelklikken. Zie `npm run build:single`.
  const single = mode === 'single';

  return {
    // Relatief pad: de build werkt op GitHub Pages (subpad /metro-manager/) en op elke andere host.
    base: './',
    plugins: single ? [tailwindcss(), viteSingleFile()] : [tailwindcss()],
    build: single ? { outDir: 'dist-single', assetsInlineLimit: 100_000_000 } : {},
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
