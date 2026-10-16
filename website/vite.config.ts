import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built site works from any host or sub-path (e.g. GitHub Pages /inflow/).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5180 },
});
