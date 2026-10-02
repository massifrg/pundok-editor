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

  router.post('/login', async (req, res, next) => {
    try {
      const session = await authentication.login(
        req.body?.user,
        req.body?.password,
      );
      backend.prepareUser(session.user);
      setImageToken(res, session.token, req.secure);
      res.json(session);
    } catch (error) {
      next(error);
    }
  });

  router.get('/image', async (req, res, next) => {
    try {
      const token = cookie(req.header('cookie'), 'pundok-editor-image-token');
      const authenticatedUser = authentication.authenticate(
        token ? `Bearer ${token}` : undefined,
      );
      const path = req.query.path;
      const page = req.query.page;
      if (
        typeof path !== 'string' ||
        (page !== undefined && typeof page !== 'string')
      )
        throw new Error('An image path and optional page are required');
      const image = await backend.image(authenticatedUser.username, path, page);
      res.type(image.contentType).send(image.body);
    } catch (error) {
      next(error);
    }
  });

  router.get('/events', (req, res, next) => {
    try {
      const authenticatedUser = authentication.authenticate(
        req.header('authorization'),
      );
      backend.prepareUser(authenticatedUser.username);
      backend.events.connect(authenticatedUser.username, res);
    } catch (error) {
      next(error);
    }
  });

  router.use((req, res, next) => {
    try {
      const authenticatedUser = authentication.authenticate(
        req.header('authorization'),
      );
      backend.prepareUser(authenticatedUser.username);
      (req as AuthenticatedRequest).username = authenticatedUser.username;
      const token = req.header('authorization')?.replace(/^Bearer /, '');
      if (token) setImageToken(res, token, req.secure);
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
    '/get-value',
    asyncHandler((req) => backend.getValue(username(req), req.body?.key)),
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
    '/find-resource-files',
    asyncHandler((req) =>
      backend.findResourceFiles(
        username(req),
        req.body?.filenameRegex,
        req.body?.regexFlags,
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
  router.post(
    '/list-git-repositories',
    asyncHandler((req) => backend.listGitRepositories(username(req))),
  );
  router.post(
    '/clone-git-project',
    asyncHandler((req) =>
      backend.cloneGitProject(username(req), req.body?.options),
    ),
  );
  router.post(
    '/publish-git-project',
    asyncHandler((req) =>
      backend.publishGitProject(username(req), req.body?.options),
    ),
  );
  router.post(
    '/connect-git-project',
    asyncHandler((req) =>
      backend.connectGitProject(username(req), req.body?.options),
    ),
  );
  router.post(
    '/git-project-status',
    asyncHandler((req) =>
      backend.gitProjectStatus(username(req), req.body?.path),
    ),
  );
  router.post(
    '/init-git-project',
    asyncHandler((req) =>
      backend.initGitProject(username(req), req.body?.path),
    ),
  );
  router.post(
    '/stage-git-project',
    asyncHandler((req) =>
      backend.stageGitProject(username(req), req.body?.path, req.body?.paths),
    ),
  );
  router.post(
    '/commit-git-project',
    asyncHandler((req) =>
      backend.commitGitProject(username(req), req.body?.options),
    ),
  );
  router.post(
    '/scan-git-projects',
    asyncHandler((req) =>
      backend.scanGitProjects(
        username(req),
        req.body?.url,
        req.body?.user,
        req.body?.password,
      ),
    ),
  );

  return router;
}

function cookie(header: string | undefined, name: string): string | undefined {
  return header
    ?.split(';')
    .map((value) => value.trim().split('=', 2))
    .find(([key]) => key === name)?.[1];
}

function setImageToken(res: Response, token: string, secure: boolean): void {
  res.cookie('pundok-editor-image-token', token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/backend/image',
    secure,
  });
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
