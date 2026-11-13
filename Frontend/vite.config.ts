import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Libraries change rarely, so they get their own long-cached files
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor-react';
          if (/node_modules\/(gsap|@gsap|lenis)\//.test(id)) return 'vendor-animation';
          if (/node_modules\/(i18next|react-i18next)\//.test(id)) return 'vendor-i18n';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5176,
    strictPort: true,
    proxy: {
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
