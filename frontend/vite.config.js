import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    // Copy TinyMCE runtime assets (skins, icons, themes, models, plugins) to /tinymce/
    viteStaticCopy({
      targets: [
        // TinyMCE assets
        ...['skins', 'icons', 'themes', 'models', 'plugins'].map((dir) => ({
          src: `node_modules/tinymce/${dir}`,
          dest: 'tinymce',
        })),
        // jQuery (for elFinder)
        { src: 'node_modules/jquery/dist', dest: 'libs/jquery' },
        // jQuery UI (for elFinder)
        { src: 'node_modules/jquery-ui-dist', dest: 'libs' },
      ],
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
