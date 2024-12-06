const path = require('path');

if (process.env.VITE_APP_VERSION === undefined) {
  // const now = new Date();
  // process.env.VITE_APP_VERSION = `${now.getUTCFullYear() - 2000}.${
  //   now.getUTCMonth() + 1
  // }.${now.getUTCDate()}-${now.getUTCHours() * 60 + now.getUTCMinutes()}`;
  process.env.VITE_APP_VERSION = require(path.resolve(
    './package.json'
  )).version;
}

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: 'PundokEditor',
  productName: 'PundokEditor',
  copyright: 'Copyright © 2023 ${author}',
  directories: {
    output: 'dist',
    buildResources: 'buildResources',
  },
  files: ['packages/**/dist/**'],
  extraMetadata: {
    version: process.env.VITE_APP_VERSION,
  },
  mac: {
    category: 'public.app-category.productivity',
    target: 'dmg',
  },
  win: {
    target: 'portable',
  },
  deb: {
    category: 'Office',
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
};

module.exports = config;
