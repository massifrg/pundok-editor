import type { MenuItemConstructorOptions } from 'electron';
import { BaseWindow, BrowserWindow, Menu, WebContentsView } from 'electron';
import { basename, join } from 'path';
import { URL } from 'url';
import { IpcHub } from './ipc/ipcHub';
import {
  askAndLoadConfFromFile,
  askAndSaveConfToFile,
  checkAndCreateAppDataDir,
} from './resourcesManager';
import { updateStaticResources } from './staticResources';
import { getBookmarks } from './bookmarks';
import { readFile } from 'fs/promises';

let showDeveloperTools = !!import.meta.env.DEV;
let showPdfView = false;
let pdfViewRelWidth = 0.6; // 0.35;
let resizeEditorView: (options?: { refreshDevTools?: boolean }) => void;

async function createWindow() {
  const baseWindow = new BaseWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: false,
    show: false, // Use 'ready-to-show' event to show window
    // webPreferences: {
    //   // nativeWindowOpen: true,
    //   webviewTag: false, // The webview tag is not recommended. Consider alternatives like iframe or Electron's BrowserView. https://www.electronjs.org/docs/latest/api/webview-tag#warning
    //   preload: join(__dirname, '../../preload/dist/index.cjs'),
    //   devTools: true,
    //   spellcheck: true,
    //   // nodeIntegration: true,
    //   // contextIsolation: true,
    // },
  });

  // const baseWindow = new BaseWindow({ width: 800, height: 400 })

  const editorView = new WebContentsView({
    webPreferences: {
      // nativeWindowOpen: true,
      webviewTag: false, // The webview tag is not recommended. Consider alternatives like iframe or Electron's BrowserView. https://www.electronjs.org/docs/latest/api/webview-tag#warning
      preload: join(__dirname, '../../preload/dist/index.cjs'),
      devTools: true,
      spellcheck: true,
      webSecurity: false,
    },
  });
  editorView.webContents.session.protocol.handle('img', async (request) => {
    const url = request.url;
    const imageBuffer = await readFile(url.substring('img://'.length));
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' })
    return new Response(blob, {
      status: 200,
      headers: { 'Content-Type': blob.type }
    });
  })
  baseWindow.contentView.addChildView(editorView);
  editorView.setBounds({ x: 0, y: 0, width: 600, height: 600 });

  const pdfView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, '../../preload/dist/index.cjs'),
      devTools: true,
      spellcheck: false,
    },
  });
  baseWindow.contentView.addChildView(pdfView);
  pdfView.setVisible(showPdfView);
  pdfView.webContents.openDevTools();

  resizeEditorView = (options?: { refreshDevTools?: boolean }) => {
    const { width, height } = baseWindow.getContentBounds();
    let pdfwidth = pdfViewRelWidth * width;
    pdfwidth = pdfwidth < 200 ? 200 : pdfwidth;
    const editwidth = showPdfView ? width - pdfwidth : width;
    editorView.setBounds({
      x: 0,
      y: 0,
      width: editwidth,
      height,
    });
    pdfView.setBounds({
      x: editwidth,
      y: 0,
      width: pdfwidth,
      height,
    });

    if (showDeveloperTools && options?.refreshDevTools) {
      editorView.webContents.closeDevTools();
      editorView.webContents.openDevTools();
    }
  };

  baseWindow.on('resize', resizeEditorView);
  baseWindow.on('restore', () => resizeEditorView({ refreshDevTools: true }));
  baseWindow.on('maximize', () => resizeEditorView({ refreshDevTools: true }));
  // baseWindow.on('unmaximize', () =>
  //   resizeEditorView({ refreshDevTools: true }),
  // );

  /**
   * If you install `show: true` then it can cause issues when trying to close the window.
   * Use `show: false` and listener events `ready-to-show` to fix these issues.
   *
   * @see https://github.com/electron/electron/issues/25012
   */
  baseWindow.on('show', () => {
    resizeEditorView({ refreshDevTools: true });
    baseWindow.setTitle('Pandoc Native Types Visual Editor');
  });

  // const wc = browserWindow.webContents

  // wc.executeJavaScript( 'window.INSIDE_ELECTRON = true' )

  // wc.on( 'will-navigate', ( e, url ) => {
  //   console.log( url )
  //   e.preventDefault()
  // })

  const ipcHub = new IpcHub(baseWindow, editorView, pdfView);
  refreshMainMenu(ipcHub);

  // await loadEditor(browserWindow);
  await loadEditor(editorView);
  await loadViewer(pdfView);

  return baseWindow;
}

async function loadEditor(win: BrowserWindow | WebContentsView) {
  /**
   * URL for main window.
   * Vite dev server for development.
   * `file://../renderer/index.html` for production and test
   */
  const pageUrl =
    import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_URL !== undefined
      ? import.meta.env.VITE_DEV_SERVER_URL
      : new URL(
        '../renderer/dist/index.html',
        'file://' + __dirname,
      ).toString();

  await win.webContents.loadURL(pageUrl);
}

async function loadViewer(win: BrowserWindow | WebContentsView) {
  /**
   * URL for viewer window.
   * Vite dev server for development.
   * `file://../renderer/viewer.html` for production and test
   */
  const pageUrl =
    import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_URL !== undefined
      ? import.meta.env.VITE_DEV_SERVER_URL + 'viewer.html'
      : new URL(
        '../renderer/dist/viewer.html',
        'file://' + __dirname,
      ).toString();
  console.log(pageUrl);
  await win.webContents.loadURL(pageUrl);
}

/**
 * Restore existing BrowserWindow or Create new BrowserWindow
 */
export async function restoreOrCreateWindow() {
  checkAndCreateAppDataDir();

  let window = BaseWindow.getAllWindows().find((w) => !w.isDestroyed());

  if (window === undefined) {
    window = await createWindow();
  }

  window.show();

  if (window.isMinimized()) {
    window.restore();
  }

  window.focus();
}

// import { app } from 'electron'

// let mainWindow: BrowserWindow | null

// app.whenReady().then(() => {
//   createWindow()

//   app.on('activate', () => {
//     if (BrowserWindow.getAllWindows().length === 0) {
//       createWindow()
//     }
//   })
// })

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit()
//   }
// })

export async function refreshMainMenu(ipcHub: IpcHub) {
  const bookmarks = await getBookmarks();
  const recentDocsMenu = bookmarks
    .filter((b) => b.type === 'document')
    .map((b) => ({
      label: b.id || basename(b.path),
      sublabel: b.path,
      tooltip: b.path,
      click: () => {
        ipcHub.fireEventOpenDocument(b.path, b.configurationName);
      },
    }));
  const recentProjectsMenu = bookmarks
    .filter((b) => b.type === 'project')
    .map((b) => ({
      label: b.name,
      sublabel: b.path,
      tooltip: b.path,
      click: () => {
        ipcHub.fireEventOpenDocument(b.path);
      },
    }));
  const recentMenu = [
    {
      label: 'document...',
      submenu: recentDocsMenu,
    },
    {
      label: 'project...',
      submenu: recentProjectsMenu,
    },
  ];
  const template: Partial<MenuItemConstructorOptions>[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open',
          accelerator: 'CommandOrControl+O',
          click: () => {
            // ipcHub.openDocument();
            ipcHub.fireEventOpenDocument();
          },
        },
        {
          label: 'Open recent...',
          submenu: recentMenu,
        },
        {
          label: 'Save',
          accelerator: 'CommandOrControl+S',
          click: () => {
            ipcHub.fireEventSaveCurrentDocument();
          },
        },
        {
          label: 'Save as',
          accelerator: 'CommandOrControl+Shift+S',
          click: () => {
            ipcHub.fireEventSaveCurrentDocumentAs();
          },
        },
        {
          label: 'Import',
          click: () => {
            ipcHub.fireEventImportDocument();
          },
        },
        {
          label: 'Export',
          click: () => {
            ipcHub.fireEventExportCurrentDocument();
          },
        },
        // {
        //   type: 'separator',
        // },
        // {
        //   label: 'New project',
        //   click: async () => {
        //     // sendCommandToRenderer(
        //     //   browserWindow,
        //     //   'ask-value',
        //     //   IPC_VALUE_NEW_PROJECT_NAME
        //     // );
        //   },
        // },
        // {
        //   label: 'Open project',
        // },
        // {
        //   label: 'Close project',
        // },
        {
          type: 'separator',
        },
        {
          label: 'Update static resources',
          click: () => {
            updateStaticResources((msg) => {
              console.log(msg);
            });
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Upload configurations',
          click: async () => {
            await askAndLoadConfFromFile();
            await loadEditor(ipcHub.editorView);
          },
        },
        {
          label: 'Download configurations',
          click: async () => {
            await askAndSaveConfToFile();
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Exit',
          role: 'quit',
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        {
          role: 'zoomIn',
          accelerator: 'CommandOrControl+=',
          // you must set 'CommandOrControl+=' to have CTRL+ (though it's wrong in the menu)
          // see https://github.com/electron/electron/issues/15496
        },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Tools',
      submenu: [
        {
          role: 'toggleSpellChecker',
          checked: false,
        },
        {
          type: 'checkbox',
          label: 'Toggle Developer Tools',
          accelerator: 'CommandOrControl+Shift+I',
          checked: showDeveloperTools,
          click: async () => {
            showDeveloperTools = !showDeveloperTools;
            if (showDeveloperTools)
              resizeEditorView({ refreshDevTools: showDeveloperTools });
            else ipcHub.editorView.webContents.closeDevTools();
          },
        },
        {
          type: 'checkbox',
          label: 'Toggle PDF View',
          checked: showPdfView,
          click: async () => {
            showPdfView = !showPdfView;
            if (showPdfView) {
              loadViewer(ipcHub.pdfView);
              ipcHub.pdfView.setVisible(true);
            }
            resizeEditorView({ refreshDevTools: showDeveloperTools });
          },
        },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
