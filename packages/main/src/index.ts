import { app } from 'electron';
import './security-restrictions';
import { restoreOrCreateWindow, WindowWithIpc } from './mainWindow';
import { copyMissingStaticResourcesInUserDir } from './staticResources';
import { parseCommandLineOpts } from './cli';

/** A global variable of the main window with its Ipc */
let mainWindowWithIpc: WindowWithIpc | undefined = undefined

// An interface to put process.argv of a second instance into
// the additional data of the callback to prevent chrome from
// intersparsing options among arguments passed to the second instance.
interface SecondInstanceData extends Record<string, any> {
  argv: string // a JSON.stringified version of process.argv
}

/**
 * Prevent multiple instances
 */
const isSingleInstance = app.requestSingleInstanceLock({
  argv: JSON.stringify(process.argv)
});
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', (event, argv, pwd, data) => {
  const sid = data as SecondInstanceData
  const args = sid?.argv && JSON.parse(sid.argv) || argv
  if (mainWindowWithIpc) parseCommandLineOpts(mainWindowWithIpc, args, pwd)
})

/**
 * Disable Hardware Acceleration for more power-save
 */
app.disableHardwareAcceleration();

/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * @see https://www.electronjs.org/docs/v14-x-y/api/app#event-activate-macos Event: 'activate'
 */
app.on('activate', restoreOrCreateWindow);

/**
 * Create app window when background process will be ready
 */
app
  .whenReady()
  .then(restoreOrCreateWindow)
  .then(windowWithIpc => {
    if (windowWithIpc) {
      mainWindowWithIpc = windowWithIpc
      parseCommandLineOpts(windowWithIpc)
    }
  })
  .catch((e) => console.error('Failed create window:', e));

/**
 * Install Vue.js or some other devtools in development mode only
 * fix from https://github.com/cawa-93/vite-electron-builder/issues/952#issuecomment-1828391997
 */
const VUEJS3_DEVTOOLS = 'nhdogjmejiglipccpnnnanhbledajbpd';
app
  .whenReady()
  .then(() => import('electron-devtools-installer'))
  .then((module) => {
    const { default: installExtension } =
      // @ ts-expect-error Hotfix for https://github.com/cawa-93/vite-electron-builder/issues/915
      typeof module.default === 'function'
        ? module
        : (module.default as unknown as typeof module);

    return installExtension(VUEJS3_DEVTOOLS, {
      loadExtensionOptions: {
        allowFileAccess: true,
      },
    });
  })
  .catch((e) => console.error('Failed install extension:', e));

/**
 * Check new app version in production mode only
 */
if (import.meta.env.PROD) {
  app
    .whenReady()
    .then(() => import('electron-updater'))
    .then(({ autoUpdater }) => autoUpdater.checkForUpdatesAndNotify())
    .catch((e) => console.error('Failed check updates:', e));
}

/**
 * Copy missing resource files into user data dir (especially useful on the first run).
 */
app
  .whenReady()
  .then(() => copyMissingStaticResourcesInUserDir((msg) => console.log(msg)));

app.on('before-quit', async (event) => {
  // TODO: check if the document has unsaved changes
  // event.preventDefault()
});
