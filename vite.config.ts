import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'cloudflare-spa-fallback',
      closeBundle() {
        const indexPath = path.resolve(__dirname, 'dist/index.html')
        if (fs.existsSync(indexPath)) {
          fs.copyFileSync(indexPath, path.resolve(__dirname, 'dist/200.html'))
          fs.copyFileSync(indexPath, path.resolve(__dirname, 'dist/404.html'))
        }
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/qrcode')) {
            return 'vendor-qr';
          }
        },
      },
    },
  },
})
