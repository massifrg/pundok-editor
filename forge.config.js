module.exports = {
  packagerConfig: {},
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'electron_quick_start',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-wix',
      config: {
        language: 1033,
        manufacturer: 'massifrg',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        category: 'Office',
        maintainer: 'mf <massifrg@gmail.com>',
        icon: 'buildResources/icon.icns',
        synopsis: 'A visual editor for Pandoc AST types',
        depends: ['libnotify4', 'libxtst6', 'libnss3', 'pandoc (>= 3.1)'],
      },
    },
  ],
};
