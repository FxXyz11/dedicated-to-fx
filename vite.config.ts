import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Dedicated to Fx',
        short_name: 'To Fx',
        description: 'A private English reading manuscript for Fx.',
        theme_color: '#f4f0e7',
        background_color: '#f4f0e7',
        display: 'standalone',
        start_url: './',
        scope: './',
        lang: 'zh-CN',
        icons: [
          {
            src: 'icons/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,png,ico,jpg,webp,json}']
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts'
  }
})
