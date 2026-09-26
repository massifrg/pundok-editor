import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createBackendRouter } from './routes';

const PORT = Number(process.env.PORT) || 3000;
const rendererDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../renderer/dist');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use('/backend', createBackendRouter());
app.use(express.static(rendererDist));

app.listen(PORT, () => {
  console.log(`pundok-editor server listening on port ${PORT}`);
});
