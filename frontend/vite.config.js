import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    // Copy TinyMCE runtime assets (skins, icons, themes, models, plugins) to /tinymce/
    viteStaticCopy({
      targets: ['skins', 'icons', 'themes', 'models', 'plugins'].map((dir) => ({
        src: `node_modules/tinymce/${dir}`,
        dest: 'tinymce',
      })),
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
});
