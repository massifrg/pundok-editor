import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import vue from 'eslint-plugin-vue';

export default [
  // Files/directories that should never be linted.
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'packages/preload/exposedInMainWorld.d.ts',
      '*.min.js',
    ],
  },

  // Plain JavaScript.
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },

  // TypeScript.
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,

      // TypeScript knows about these; the core rule does not.
      'no-unused-vars': 'off',

      // Existing project convention.
      '@typescript-eslint/no-unused-vars': 'warn',

      // Useful in a codebase with explicit type imports.
      '@typescript-eslint/consistent-type-imports': 'error',

      // Keep this permissive for existing Electron/CommonJS-oriented code.
      '@typescript-eslint/no-var-requires': 'off',

      // This codebase is not uniformly explicit about function return types.
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Vue 3 SFCs.
  ...vue.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Apply the TypeScript rules to the <script> blocks.
      ...tsPlugin.configs.recommended.rules,

      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',

      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Electron / Node-side files.
  {
    files: [
      'electron-builder.mjs',
      'forge.config.js',
      'scripts/**/*.js',
      'packages/main/**/*.ts',
      'packages/preload/**/*.ts',
    ],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
  },

  // Renderer-side globals.
  {
    files: ['packages/renderer/**/*.ts', 'packages/renderer/**/*.vue'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        HTMLElement: 'readonly',
        Node: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        console: 'readonly',
      },
    },
  },

  // Project-specific globals inherited from the old Quasar/Vue config.
  {
    files: ['**/*.js', '**/*.ts', '**/*.vue'],
    languageOptions: {
      globals: {
        ga: 'readonly',
        cordova: 'readonly',
        __statics: 'readonly',
        __QUASAR_SSR__: 'readonly',
        __QUASAR_SSR_SERVER__: 'readonly',
        __QUASAR_SSR_CLIENT__: 'readonly',
        __QUASAR_SSR_PWA__: 'readonly',
        Capacitor: 'readonly',
        chrome: 'readonly',
      },
    },
    rules: {
      // Development use is intentional in this application.
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

      // Existing project behaviour.
      'prefer-promise-reject-errors': 'off',

      // Formatting belongs to Prettier.
      quotes: ['warn', 'single', { avoidEscape: true }],
    },
  },

  // Let Prettier own formatting rules.
  eslintConfigPrettier,
];
