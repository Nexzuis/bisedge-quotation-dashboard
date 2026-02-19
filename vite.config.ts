import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  server: {
    port: 5173,
    strictPort: true, // Force port 5173, error if unavailable
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-zustand': ['zustand', 'immer'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-pdf': ['@react-pdf/renderer'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
          'vendor-xlsx': ['xlsx'],
        },
      },
    },
  },
})
