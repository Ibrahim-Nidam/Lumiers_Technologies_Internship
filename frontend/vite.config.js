import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), compression(),visualizer({ open: true }),],
  build: {
    chunkSizeWarningLimit: 1500, // Optional: suppress large chunk warnings
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('react-icons')) return 'vendor-icons';
            if (id.includes('xlsx') || id.includes('exceljs')) return 'vendor-xlsx';
            if (id.includes('pdfmake')) return 'vendor-pdf';
            if (id.includes('chart.js')) return 'vendor-charts';
            return 'vendor';
          }
        },
      },
      treeshake: true, // Make sure tree-shaking is enabled
    },
  },
});
