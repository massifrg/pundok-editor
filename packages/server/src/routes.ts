import { Router, type Request, type Response, type NextFunction } from 'express';
import { PundokEditorServer } from './pundokEditorServer';

/**
 * Builds the Express router that exposes every method of {@link PundokEditorServer}
 * (i.e. every method of `Backend`/`NetBackend`) as a POST route.
 *
 * The route names reuse the very same channel names that `LocalBackend`
 * uses for the Main <-> Renderer IPC (see `IPC_CHANNELS` in
 * `packages/common/src/ipc.ts`), so that the "renderer -> main" channels
 * (`r2m`) become "renderer -> server" HTTP routes here.
 *
 * `NetBackend`'s `login`/`logout`/`loggedin` have no IPC counterpart
 * (the Electron app has no concept of login), so they get their own
 * route names.
 */
export function createBackendRouter(backend: PundokEditorServer = new PundokEditorServer()): Router {
  const router = Router();

  // Authentication, with no equivalent in the Main <-> Renderer IPC.
  router.post('/loggedin', asyncHandler((req) => backend.loggedin()));
  router.post('/login', asyncHandler((req) => backend.login(req.body?.user, req.body?.password)));
  router.post('/logout', asyncHandler((req) => backend.logout()));

  // Same route names as the `r2m` channels in `IPC_CHANNELS`.
  router.post('/debug-info', asyncHandler((req) => backend.debugInfo()));
  router.post('/editor-ready', asyncHandler((req) => backend.editorReady(req.body?.editorKey)));
  router.post('/get-folder-contents', asyncHandler((req) => backend.getFolderContents(req.body?.context)));
  router.post('/get-bookmarks', asyncHandler((req) => backend.getBookmarks(req.body?.bookmarkType)));
  router.post('/open-document', asyncHandler((req) => backend.open(req.body?.context)));
  router.post('/save-document', asyncHandler((req) => backend.save(req.body?.doc)));
  router.post('/get-project', asyncHandler((req) => backend.getProject(req.body?.options)));
  router.post('/new-project', asyncHandler((req) => backend.createProject(req.body?.path, req.body?.project)));
  router.post('/get-inclusion-tree', asyncHandler((req) => backend.getInclusionTree(req.body?.project)));
  router.post('/create-folder', asyncHandler((req) => backend.createFolder(req.body?.path)));
  router.post('/available-configurations', asyncHandler((req) => backend.availableConfigurations(req.body?.options)));
  router.post('/load-configuration', asyncHandler((req) => backend.configuration(req.body?.name)));
  router.post('/file-contents', asyncHandler((req) => backend.getFileContents(req.body?.filename, req.body?.options)));
  router.post('/query', asyncHandler((req) => backend.queryDatabase(req.body?.query)));
  router.post('/set-value', asyncHandler((req) => backend.setValue(req.body?.key, req.body?.value)));
  router.post('/pandoc-feature', asyncHandler((req) => backend.pandocFeature(req.body?.featureName, req.body?.options)));
  router.post('/transform-json', asyncHandler((req) => backend.transformPandocJson(req.body?.doc, req.body?.transform)));
  router.post('/get-source-file', asyncHandler((req) => backend.gotoSource(req.body?.editorKey, req.body?.info)));
  router.post('/render-again', asyncHandler((req) => backend.renderAgain(req.body?.hash, req.body?.editorKey)));
  router.post('/get-rendering-job', asyncHandler((req) => backend.getRenderingJob(req.body?.hash)));
  router.post('/show-rendered-again', asyncHandler((req) => backend.showAgain(req.body?.hash, req.body?.editorKey)));
  router.post('/update-config', asyncHandler((req) => backend.storeInConfiguration(req.body?.options)));

  // The `m2r` channels (`feedback`, `content`, `set-configuration`, `set-project`,
  // `document`, `ask-value`, `show-in-viewer`, `new-empty-document`) are pushed
  // from the server to the renderer (e.g. over a WebSocket or SSE connection)
  // and are not implemented in this stub.

  return router;
}

/** Wraps a route handler, sending its resolved value as JSON and forwarding errors to Express. */
function asyncHandler(
  handler: (req: Request) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req)
      .then((result) => res.json(result ?? null))
      .catch(next);
  };
}
