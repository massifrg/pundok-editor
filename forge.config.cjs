const path = require('node:path');

/**
 * Electron Forge configuration intended to mirror
 * electron-builder.mjs as closely as Forge allows.
 *
 * Important:
 * - electron-builder's Windows "portable" target has no direct
 *   Electron Forge equivalent.
 * - electron-builder's `files` list is expressed below through
 *   Electron Packager's `ignore` callback.
 * - Keep this file as CommonJS because the project declares
 *   `"type": "module"`.
 */

const root = path.resolve(__dirname);

const keepPaths = [
  /^[/\\]package\.json$/,
  /^[/\\]LICENSE(?:$|[/\\])/i,

  // Compiled application packages.
  /^[/\\]packages[/\\][^/\\]+[/\\]dist(?:[/\\]|$)/,

  // The Electron main entry point is already covered by packages/**/dist/**.
  // Keep package manifests for runtime package metadata.
  /^[/\\]packages[/\\][^/\\]+[/\\]package\.json$/,

  // Runtime static resources are added separately with extraResource.
];

/**
 * Forge / @electron/packager calls this with absolute paths.
 *
 * Return true when the path should be ignored.
 */
function ignore(filePath) {
  const relative = path.relative(root, filePath);
  const normalized = `/${relative.replaceAll(path.sep, '/')}`;

  // Always exclude source/config/build-time material that should not
  // be shipped in the application.
  const alwaysIgnore = [
    /^\/(?:\.git|\.github|\.vscode)(?:\/|$)/,
    /^\/(?:src|test|tests)(?:\/|$)/,
    /^\/(?:coverage|dist)(?:\/|$)/,

    // Package source/configuration; the compiled dist directories are
    // kept by the rules above.
    /^\/packages\/[^/]+\/(?:src|test|tests|node_modules)(?:\/|$)/,
    /^\/packages\/[^/]+\/(?:vite|vitest|tsconfig|eslint|quasar)\.[^/]+$/,

    // Development/build configuration.
    /^\/(?:electron-builder\.mjs|forge\.config\.(?:js|cjs)|eslint\.config\.js|vitest\.config\.js|vite\.config\.[^/]+|quasar\.config\.[^/]+)$/,

    // Documentation/development metadata that is not part of the app.
    /^\/(?:README(?:\.[^/]+)?|CHANGELOG(?:\.[^/]+)?|docs)(?:\/|$)/,
    /^\/\.env(?:\..*)?$/,

    // Generated/editor/development files.
    /^\/(?:schemas)(?:\/|$)/,
    /^\/scripts(?:\/|$)/,
  ];

  if (alwaysIgnore.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  // Keep only the paths that correspond reasonably closely to
  // electron-builder's `files` configuration.
  const explicitlyKept = keepPaths.some((pattern) => pattern.test(normalized));

  if (explicitlyKept) {
    return false;
  }

  // Keep staticResources out of the application bundle here because
  // it is copied to the Resources directory through extraResource.
  if (
    normalized === '/staticResources' ||
    normalized.startsWith('/staticResources/')
  ) {
    return true;
  }

  /*
   * Leave node_modules alone.
   *
   * Electron Packager prunes devDependencies by default, which is the
   * closest Forge equivalent to electron-builder including production
   * runtime dependencies while excluding development dependencies.
   */
  if (
    normalized === '/node_modules' ||
    normalized.startsWith('/node_modules/')
  ) {
    return false;
  }

  // Ignore everything else at the project root.
  return true;
}

module.exports = {
  packagerConfig: {
    name: 'pundok-editor',
    executableName: 'pundok-editor',

    // Mirrors the default electron-builder packaging behaviour.
    asar: true,

    appBundleId: 'PundokEditor',
    appCategoryType: 'public.app-category.productivity',

    appCopyright: 'Copyright © 2023 mf',

    buildVersion: process.env.VITE_APP_VERSION,

    // Matches electron-builder's `extraFiles: ['staticResources']`
    // as closely as Electron Packager allows.
    extraResource: [path.join(root, 'staticResources')],

    ignore,
  },

  makers: [
    // electron-builder:
    //   mac.target = "dmg"
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
    },

    // Optional ZIP alongside DMG. This is useful for macOS updates,
    // although it is not part of the current electron-builder config.
    //
    // Remove this if exact target parity is preferred.
    /*
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    */

    // electron-builder:
    //   linux.target = "AppImage"
    {
      // name: '@electron-forge/maker-appimage',
      name: 'electron-forge-maker-appimage',
      platforms: ['linux'],
      config: {
        options: {
          name: 'pundok-editor',
          productName: 'pundok-editor',
          categories: ['Office'],
          maintainer: 'mf <massifrg@gmail.com>',
          genericName: 'Pandoc document editor',
        },
      },
    },

    // electron-builder:
    //   deb.packageName = "pundok-editor"
    //   deb.packageCategory = "editors"
    //   deb.category = "Office; Utility;"
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          name: 'pundok-editor',
          productName: 'pundok-editor',
          categories: ['Office', 'Utility'],
          maintainer: 'mf <massifrg@gmail.com>',
          synopsis: 'A visual editor for Pandoc AST types',
          icon: path.join(root, 'icon'),

          depends: [
            'libgtk-3-0',
            'libnotify4',
            'libnss3',
            'libxss1',
            'libxtst6',
            'xdg-utils',
            'libatspi2.0-0',
            'libuuid1',
            'libsecret-1-0',
            'pandoc (>= 3.1)',
          ],

          recommends: ['libappindicator3-1'],
        },
      },
    },

    // There is no direct Forge equivalent to electron-builder's
    // Windows `portable` target.
    //
    // Squirrel is intentionally NOT enabled here because that would
    // create a Windows installer, not a portable executable.
    //
    // If an installer is acceptable, add:
    //
    // {
    //   name: '@electron-forge/maker-squirrel',
    //   platforms: ['win32'],
    //   config: {
    //     name: 'PundokEditor',
    //     authors: 'mf',
    //     description: 'A visual editor for Pandoc AST documents',
    //   },
    // },

    // The existing electron-builder config does not build MSI/WiX,
    // so the old Forge WiX maker is deliberately omitted.
  ],
};
