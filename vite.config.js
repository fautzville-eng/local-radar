import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/local-radar/',

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'icon-192.png',
        'icon-512.png',
      ],

      manifest: {
        name: 'LocalRadar',
        short_name: 'LocalRadar',

        description:
          'Find your approximate location and view recent precipitation radar.',

        theme_color: '#2563eb',
        background_color: '#eef2f7',

        display: 'standalone',

        start_url: './',
        scope: './',

        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})