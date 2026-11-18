import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// Each build gets its own id. The page carries it (__BUILD_ID__) and the server answers it at /build.json,
// so a page opened from the device's copy can tell that the server has a newer build (src/app/updates.ts).
const BUILD_ID = Date.now().toString(36);

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  // The teaching lessons (plan section 16) go in a file of their own: with them the main file would pass the
  // 2 MB limit for files kept on the device, and the app would stop opening offline.
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => (id.includes('/src/lessons/') ? 'lessons' : undefined),
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'sprout-build-id',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'build.json', source: JSON.stringify({ id: BUILD_ID }) });
      },
    },
    // The service worker (the owner's choice, Nov 17, 2026: always the newest build on the server).
    // Opening the app asks the server for the page first; the copy kept on the device is used only with no
    // network, or when the server takes longer than 4 seconds. Every other app file is kept on the device
    // under its own hashed name, so a page from the server finds its files there or fetches them.
    // A new service worker takes over as soon as it is installed. It never caches or answers anything under /api,
    // and /build.json is never kept (it is not in globPatterns).
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      manifest: false, // public/manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,woff2}'],
        // No page is answered from the kept files first: '/' is not mapped to index.html.
        directoryIndex: null,
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.mode === 'navigate' && !/^\/api(\/|$)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sprout-pages',
              networkTimeoutSeconds: 4,
              precacheFallback: { fallbackURL: '/index.html' },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  server: {
    // The local Worker, started with `npm run dev:worker`.
    proxy: { '/api': 'http://localhost:8787' },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    css: false,
    testTimeout: 30_000,
  },
});
