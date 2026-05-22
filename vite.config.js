import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// ============================================================================
// Vite Configuration for Shift Roster App
// - React plugin for JSX support
// - Path aliases for clean imports (@components, @services, etc.)
// - Base path set for GitHub Pages deployment
// ============================================================================

export default defineConfig({
  plugins: [react()],

  // Base path for GitHub Pages (change 'shift-roster' to your repo name)
  base: '/ShiftRoaster/',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@context': path.resolve(__dirname, 'src/context'),
    },
  },

  server: {
    port: 3000,
    open: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
