import express from 'express';
import { createBackendRouter } from './routes';

const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use('/api', createBackendRouter());

app.listen(PORT, () => {
  console.log(`pundok-editor server listening on port ${PORT}`);
});
