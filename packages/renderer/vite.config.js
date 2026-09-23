import { defineConfig } from 'vite';
import { getChromeVersion } from '../electron-versions/index.js';
import { builtinModules } from 'module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import vue from '@vitejs/plugin-vue';
// import vueI18n from '@intlify/vite-plugin-vue-i18n'
// see https://vue-i18n.intlify.dev/guide/advanced/sfc.html
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
// import { visualizer } from 'rollup-plugin-visualizer';
import { analyzer } from 'vite-bundle-analyzer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_ROOT = __dirname;

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  resolve: {
    alias: {
      // '/@/': join(PACKAGE_ROOT, 'src') + '/',
      '#q-app': fileURLToPath(new URL('./.quasar/imports', import.meta.url)),
      app: PACKAGE_ROOT,
    },
  },
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    quasar({
      sassVariables: resolve(
        dirname(fileURLToPath(import.meta.url)),
        './src/assets/css/quasar.variables.scss',
      ),
    }),
    VueI18nPlugin({
      /* options */
      // locale messages resource pre-compile option
      include: resolve(
        dirname(fileURLToPath(import.meta.url)),
        './src/locales/**',
      ),
    }),
    analyzer({
      analyzerMode: 'static',
      fileName: 'bundle-report',
      openAnalyzer: false,
      brotliOptions: {},
      enabled: process.env.ANALYZE === 'true',
    }),
    // visualizer({
    // filename: 'stats.html', // output file
    // template: 'network', // "sunburst" | "treemap" | "network"
    // gzipSize: true,
    // brotliSize: true,
    // }),
  ],
  pluginOptions: {},
  base: '',
  server: {
    fs: {
      strict: true,
    },
  },
  define: {
    'process.env': JSON.stringify(process.env),
    'process.platform': JSON.stringify(process.platform),
  },
  build: {
    sourcemap: true,
    target: `chrome${getChromeVersion()}`,
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      input: {
        editor: 'index.html',
      },
      external: [...builtinModules.flatMap((p) => [p, `node:${p}`])],
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@codemirror/view/')) {
            return 'codemirror-view';
          }
          if (id.includes('/node_modules/@codemirror/')) {
            return 'codemirror';
          }
          if (id.includes('/node_modules/@lezer/')) {
            return 'lezer';
          }
          if (
            id.includes('/node_modules/highlight.js/') ||
            id.includes('/node_modules/lowlight/')
          ) {
            return 'syntax-highlighting';
          }
        },
      },
    },
    emptyOutDir: true,
    brotliSize: false,
  },
  optimizeDeps: {
    include: [
      'prosemirror-state',
      'prosemirror-transform',
      'prosemirror-model',
      'prosemirror-view',
    ],
  },
  // test: {
  //   // environment: 'happy-dom',
  // },
  // The next css section is from https://stackoverflow.com/questions/68147471/how-to-set-sassoptions-in-vite/78997875#78997875
  // to solve "Deprecation Warning: The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0."
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api'],
        api: 'modern-compiler', // or 'modern'
      },
    },
  },
});
