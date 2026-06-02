import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    // Целимся в старые движки WebView (iOS 13+, Android System WebView ~2019+),
    // которыми Telegram открывает Mini App. Без этого Vite оставляет современный
    // синтаксис (?., ??, ??=/||=/&&=), и старые WebView падают с SyntaxError —
    // React не монтируется и пользователь видит серый экран.
    target: ['es2019', 'safari13', 'chrome79', 'firefox68', 'edge79'],
    cssTarget: ['safari13', 'chrome79'],
    outDir: '../web',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
})
