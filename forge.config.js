const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
module.exports = {
packagerConfig: {
asar: true,
  },
rebuildConfig: {},
makers: [
    {
name: '@electron-forge/maker-squirrel',
config: {},
    },
    {
name: '@electron-forge/maker-zip',
platforms: ['darwin'],
    },
    {
name: '@electron-forge/maker-deb',
config: {},
    },
    {
name: '@electron-forge/maker-rpm',
config: {},
    },
  ],
plugins: [
    {
name: '@electron-forge/plugin-auto-unpack-natives',
config: {},
    },
    {
name: '@electron-forge/plugin-webpack',
config: {
devContentSecurityPolicy:
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://fonts.googleapis.com https://gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; frame-src 'self' blob:; object-src 'self' blob:;",
mainConfig: './webpack.main.config.js',
renderer: {
config: './webpack.renderer.config.js',
entryPoints: [
  {
name: 'main_window',
html: './src/index.html',              // ✅ ton vrai fichier
js: './src/renderer/index.jsx',        // ✅ ton vrai entry React
preload: {
js: './src/main/preload.js',         // ✅ celui-ci est déjà bon
    },
  },
],
        },
      },
    },
new FusesPlugin({
version: FuseVersion.V1,
[FuseV1Options.RunAsNode]: false,
[FuseV1Options.EnableCookieEncryption]: true,
[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
[FuseV1Options.EnableNodeCliInspectArguments]: false,
[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
[FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};