import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createBackendDirectories } from '../../backend/src';
import { AuthenticationError, JwtAuthentication } from './auth';
import { PundokEditorServer } from './pundokEditorServer';
import { createBackendRouter } from './routes';

const PORT = Number(process.env.PORT) || 3000;
const rendererDist = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../renderer/dist',
);
const dataDir = resolve(process.env.PUNDOK_DATA_DIR || 'data');
const testConfigurationsDir = process.env.PUNDOK_TEST_CONFIGS_DIR;
const sharedConfigurationsDir = resolve(
  testConfigurationsDir ||
    process.env.PUNDOK_CONFIGS_DIR ||
    resolve(dataDir, 'configs'),
);
const testUsername = process.env.PUNDOK_TEST_USERNAME;
const testUserDataDir = process.env.PUNDOK_TEST_USER_DATA_DIR;

if (!!testUsername !== !!testUserDataDir) {
  throw new Error(
    'PUNDOK_TEST_USERNAME and PUNDOK_TEST_USER_DATA_DIR must be set together',
  );
}
if (
  (testUsername || testUserDataDir || testConfigurationsDir) &&
  process.env.NODE_ENV !== 'development'
) {
  throw new Error(
    'PUNDOK_TEST_* overrides are only available in development mode',
  );
}

async function startServer() {
  const authentication = await JwtAuthentication.fromEnvironment();
  const backend = new PundokEditorServer((username) =>
    createBackendDirectories(
      username === testUsername && testUserDataDir
        ? resolve(testUserDataDir)
        : resolve(dataDir, 'users', username),
      sharedConfigurationsDir,
    ),
  );

  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use('/backend', createBackendRouter(backend, authentication));
  app.use(express.static(rendererDist));
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof AuthenticationError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    },
  );

  app.listen(PORT, () => {
    console.log(`pundok-editor server listening on port ${PORT}`);
  });
}

void startServer().catch((error: unknown) => {
  console.error('Failed to start pundok-editor server:', error);
  process.exitCode = 1;
});
