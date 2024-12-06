/* eslint-env node */

import { chrome } from '../../.electron-vendors.cache.json';
import { join } from 'path';
import { builtinModules } from 'module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import vue from '@vitejs/plugin-vue';
// import vueI18n from '@intlify/vite-plugin-vue-i18n'
// see https://vue-i18n.intlify.dev/guide/advanced/sfc.html
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';

const PACKAGE_ROOT = __dirname;

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
const config = {
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  resolve: {
    alias: {
      '/@/': join(PACKAGE_ROOT, 'src') + '/',
    },
  },
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    VueI18nPlugin({
      /* options */
      // locale messages resource pre-compile option
      include: resolve(
        dirname(fileURLToPath(import.meta.url)),
        './src/i18n/**',
      ),
    }),
    quasar({
      sassVariables: resolve(
        dirname(fileURLToPath(import.meta.url)),
        './src/assets/css/quasar.variables.scss',
      ),
    }),
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
    target: `chrome${chrome}`,
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      input: {
        editor: 'index.html',
        viewer: 'viewer.html',
      },
      external: [...builtinModules.flatMap((p) => [p, `node:${p}`])],
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
  test: {
    // environment: 'happy-dom',
  },
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
};

export default config;
