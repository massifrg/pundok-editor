import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { JwtAuthentication } from './auth';
import { PundokEditorServer } from './pundokEditorServer';

type AuthenticatedRequest = Request & { username: string };

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
export function createBackendRouter(
  backend: PundokEditorServer,
  authentication: JwtAuthentication,
): Router {
  const router = Router();

  router.post(
    '/login',
    asyncHandler(async (req) => {
      const session = await authentication.login(
        req.body?.user,
        req.body?.password,
      );
      backend.prepareUser(session.user);
      return session;
    }),
  );

  router.use((req, _res, next) => {
    try {
      const authenticatedUser = authentication.authenticate(
        req.header('authorization'),
      );
      backend.prepareUser(authenticatedUser.username);
      (req as AuthenticatedRequest).username = authenticatedUser.username;
      next();
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/loggedin',
    asyncHandler((req) => backend.loggedin(username(req))),
  );
  router.post(
    '/logout',
    asyncHandler(async (req) => {
      authentication.revoke(req.header('authorization'));
      return backend.logout(username(req));
    }),
  );

  // Same route names as the `r2m` channels in `IPC_CHANNELS`.
  router.post(
    '/debug-info',
    asyncHandler((req) => backend.debugInfo(username(req))),
  );
  router.post(
    '/editor-ready',
    asyncHandler((req) =>
      backend.editorReady(username(req), req.body?.editorKey),
    ),
  );
  router.post(
    '/get-folder-contents',
    asyncHandler((req) =>
      backend.getFolderContents(username(req), req.body?.context),
    ),
  );
  router.post(
    '/get-bookmarks',
    asyncHandler((req) =>
      backend.getBookmarks(username(req), req.body?.bookmarkType),
    ),
  );
  router.post(
    '/open-document',
    asyncHandler((req) => backend.open(username(req), req.body?.context)),
  );
  router.post(
    '/save-document',
    asyncHandler((req) => backend.save(username(req), req.body?.doc)),
  );
  router.post(
    '/get-project',
    asyncHandler((req) => backend.getProject(username(req), req.body?.options)),
  );
  router.post(
    '/new-project',
    asyncHandler((req) =>
      backend.createProject(username(req), req.body?.path, req.body?.project),
    ),
  );
  router.post(
    '/get-inclusion-tree',
    asyncHandler((req) =>
      backend.getInclusionTree(username(req), req.body?.project),
    ),
  );
  router.post(
    '/create-folder',
    asyncHandler((req) => backend.createFolder(username(req), req.body?.path)),
  );
  router.post(
    '/available-configurations',
    asyncHandler((req) =>
      backend.availableConfigurations(username(req), req.body?.options),
    ),
  );
  router.post(
    '/load-configuration',
    asyncHandler((req) => backend.configuration(username(req), req.body?.name)),
  );
  router.post(
    '/file-contents',
    asyncHandler((req) =>
      backend.getFileContents(
        username(req),
        req.body?.filename,
        req.body?.options,
      ),
    ),
  );
  router.post(
    '/query',
    asyncHandler((req) =>
      backend.queryDatabase(username(req), req.body?.query),
    ),
  );
  router.post(
    '/set-value',
    asyncHandler((req) =>
      backend.setValue(username(req), req.body?.key, req.body?.value),
    ),
  );
  router.post(
    '/pandoc-feature',
    asyncHandler((req) =>
      backend.pandocFeature(
        username(req),
        req.body?.featureName,
        req.body?.options,
      ),
    ),
  );
  router.post(
    '/transform-json',
    asyncHandler((req) =>
      backend.transformPandocJson(
        username(req),
        req.body?.doc,
        req.body?.transform,
      ),
    ),
  );
  router.post(
    '/get-source-file',
    asyncHandler((req) =>
      backend.gotoSource(username(req), req.body?.editorKey, req.body?.info),
    ),
  );
  router.post(
    '/render-again',
    asyncHandler((req) =>
      backend.renderAgain(username(req), req.body?.hash, req.body?.editorKey),
    ),
  );
  router.post(
    '/get-rendering-job',
    asyncHandler((req) =>
      backend.getRenderingJob(username(req), req.body?.hash),
    ),
  );
  router.post(
    '/show-rendered-again',
    asyncHandler((req) =>
      backend.showAgain(username(req), req.body?.hash, req.body?.editorKey),
    ),
  );
  router.post(
    '/update-config',
    asyncHandler((req) =>
      backend.storeInConfiguration(username(req), req.body?.options),
    ),
  );

  // The `m2r` channels (`feedback`, `content`, `set-configuration`, `set-project`,
  // `document`, `ask-value`, `show-in-viewer`, `new-empty-document`) are pushed
  // from the server to the renderer (e.g. over a WebSocket or SSE connection)
  // and are not implemented in this stub.

  return router;
}

function username(req: Request): string {
  return (req as AuthenticatedRequest).username;
}

/** Wraps a route handler, sending its resolved value as JSON and forwarding errors to Express. */
function asyncHandler(handler: (req: Request) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req)
      .then((result) => res.json(result ?? null))
      .catch(next);
  };
}
