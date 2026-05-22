import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// ============================================================================
// Vite Configuration for Shift Roster App
// - React plugin for JSX support
// - Path aliases for clean imports (@components, @services, etc.)
// - Base path set for GitHub Pages deployment (supports feature branches)
// ============================================================================

const base = process.env.VITE_BASE || '/ShiftRoaster/';

export default defineConfig({
  plugins: [react()],

  // Base path for GitHub Pages
  // - Main branch: /ShiftRoaster/
  // - Feature branches: /feature/branch-name/
  base: base,

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
