import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
            if (id.includes('node_modules')) {
              if (normalizedId.includes('firebase')) return 'vendor-firebase';
              if (
                normalizedId.includes('/react/') ||
                normalizedId.includes('/react-dom/') ||
                normalizedId.includes('/motion/') ||
                normalizedId.includes('lucide-react') ||
                normalizedId.includes('@paypal/react-paypal-js')
              ) return 'vendor-react';
              return undefined;
            }
            if (normalizedId.includes('/src/components/admin/') || normalizedId.endsWith('/src/components/AdminPanel.tsx')) {
              const componentName = normalizedId.split('/').pop()?.replace(/\.tsx?$/, '') || 'admin';
              return `admin-${componentName}`;
            }
            if (normalizedId.includes('/src/components/')) {
              const componentName = normalizedId.split('/').pop()?.replace(/\.tsx?$/, '') || 'component';
              return `component-${componentName}`;
            }
            if (normalizedId.includes('/src/context/') || normalizedId.includes('/src/lib/')) return 'store';
          },
        },
      },
    },
  };
});
