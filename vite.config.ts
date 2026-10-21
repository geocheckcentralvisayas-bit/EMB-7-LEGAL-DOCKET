import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  server: {
    open: '/vite-entry.html',
  },
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./vite-entry.html', import.meta.url)),
      },
    },
    outDir: 'dist',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    target: 'es2020',
  },
})
