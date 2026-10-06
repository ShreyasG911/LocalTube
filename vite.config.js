import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/LocalTube/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: "LocalTube",
        short_name: "LocalTube",
        description: "Your YouTube-Style Local Video Library",
        theme_color: "#0f0f0f",
        background_color: "#0f0f0f",
        display: "standalone",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "192x192 512x512",
            type: "image/svg+xml"
          }
        ]
      }
    })
  ],
})
