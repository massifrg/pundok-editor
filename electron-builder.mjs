import pkg from './package.json' with { type: 'json' };
import mapWorkspaces from '@npmcli/map-workspaces';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export default /** @type import('electron-builder').Configuration */
({
  appId: 'PundokEditor',
  productName: 'pundok-editor',
  copyright: 'Copyright © 2023 ${author}',
  directories: {
    output: 'dist',
    buildResources: 'buildResources',
  },
  // generateUpdatesFilesForAllChannels: true,
  files: [
    'packages/**/dist/**',
    'LICENSE*',
    pkg.main,
    '!node_modules/@app/**',
    ...(await getListOfFilesFromEachWorkspace()),
  ],
  extraMetadata: {
    version: process.env.VITE_APP_VERSION,
  },
  mac: {
    category: 'public.app-category.productivity',
    target: 'dmg',
  },
  win: {
    target: 'portable',
    artifactName: 'PundokEditor ${version}.${ext}',
  },
  deb: {
    artifactName: '${productName}_${version}_${arch}.${ext}',
    category: 'Office; ProjectManagement; WordProcessor; Publishing',
    maintainer: 'mf <massifrg@gmail.com>',
    icon: 'icon/',
    synopsis: 'A visual editor for Pandoc AST types',
    depends: [
      // 'gconf2',
      // 'gconf-service',
      'libnotify4',
      // 'libappindicator1',
      'libxtst6',
      'libnss3',
      'pandoc (>= 3.1)',
    ],
  },
  linux: {
    target: 'AppImage',
    category: 'Office',
    maintainer: 'mf <massifrg@gmail.com>',
    synopsis: 'A visual editor for Pandoc native types',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
  extraFiles: ['staticResources'],
  /**
   * It is recommended to avoid using non-standard characters such as spaces in artifact names,
   * as they can unpredictably change during deployment, making them impossible to locate and download for update.
   */
  // artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
});

/**
 * By default, electron-builder copies each package into the output compilation entirety,
 * including the source code, tests, configuration, assets, and any other files.
 *
 * So you may get compiled app structure like this:
 * ```
 * app/
 * ├── node_modules/
 * │   └── workspace-packages/
 * │       ├── package-a/
 * │       │   ├── src/            # Garbage. May be safely removed
 * │       │   ├── dist/
 * │       │   │   └── index.js    # Runtime code
 * │       │   ├── vite.config.js  # Garbage
 * │       │   ├── .env            # some sensitive config
 * │       │   └── package.json
 * │       ├── package-b/
 * │       ├── package-c/
 * │       └── package-d/
 * ├── packages/
 * │   └── entry-point.js
 * └── package.json
 * ```
 *
 * To prevent this, we read the “files”
 * property from each package's package.json
 * and add all files that do not match the patterns to the exclusion list.
 *
 * This way,
 * each package independently determines which files will be included in the final compilation and which will not.
 *
 * So if `package-a` in its `package.json` describes
 * ```json
 * {
 *   "name": "package-a",
 *   "files": [
 *     "dist/**\/"
 *   ]
 * }
 * ```
 *
 * Then in the compilation only those files and `package.json` will be included:
 * ```
 * app/
 * ├── node_modules/
 * │   └── workspace-packages/
 * │       ├── package-a/
 * │       │   ├── dist/
 * │       │   │   └── index.js    # Runtime code
 * │       │   └── package.json
 * │       ├── package-b/
 * │       ├── package-c/
 * │       └── package-d/
 * ├── packages/
 * │   └── entry-point.js
 * └── package.json
 * ```
 */
async function getListOfFilesFromEachWorkspace() {
  /**
   * @type {Map<string, string>}
   */
  const workspaces = await mapWorkspaces({
    cwd: process.cwd(),
    pkg,
  });

  const allFilesToInclude = [];

  for (const [name, path] of workspaces) {
    const pkgPath = join(path, 'package.json');
    const { default: workspacePkg } = await import(pathToFileURL(pkgPath), {
      with: { type: 'json' },
    });

    let patterns = workspacePkg.files || ['dist/**', 'package.json'];

    patterns = patterns.map((p) => join('node_modules', name, p));
    allFilesToInclude.push(...patterns);
  }

  return allFilesToInclude;
}
