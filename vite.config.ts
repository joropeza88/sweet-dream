import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'bg.png',
        'audio/rain.mp3',
        'audio/wind.mp3',
        'audio/thunder.mp3',
        'audio/crickets.mp3',
        'audio/frogs.mp3',
        'audio/frog2.mp3',
        'audio/toads.mp3',
        'audio/rhinophrynus_dorsalis.mp3',
        'icons/apple-touch-icon.png',
        'icons/pwa-192.png',
        'icons/pwa-512.png',
        'icons/pwa-512-maskable.png',
      ],
      manifest: {
        name: 'Sweet Dream',
        short_name: 'Sweet Dream',
        description: 'PWA moderna para combinar sonidos ambientales relajantes.',
        theme_color: '#1d354a',
        background_color: '#edf5ff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wav,mp3}'],
        globIgnores: [
          'audio/originals/**',
          'audio/__rhinophrynus_dorsalis.mp3',
        ],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'audio',
            handler: 'CacheFirst',
            options: {
              cacheName: 'ambient-audio',
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
