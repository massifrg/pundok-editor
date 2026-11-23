import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

export async function loadCachedPdfImage(
  path: string,
  imagePage: number,
  cacheDirectory: string,
  maxAgeMs: number,
  render: () => Promise<Buffer>,
): Promise<Buffer> {
  await mkdir(cacheDirectory, { recursive: true });
  await removeExpiredImages(cacheDirectory, maxAgeMs);

  const cachedPath = join(
    cacheDirectory,
    `${createHash('sha256').update(path).digest('hex')}-${imagePage}.jpg`,
  );
  const [pdfInfo, cachedInfo] = await Promise.all([
    stat(path),
    stat(cachedPath).catch(() => undefined),
  ]);
  if (cachedInfo && pdfInfo.mtimeMs <= cachedInfo.mtimeMs)
    return readFile(cachedPath);

  const image = await render();
  const temporaryPath = `${cachedPath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, image);
  await rename(temporaryPath, cachedPath);
  return image;
}

async function removeExpiredImages(
  cacheDirectory: string,
  maxAgeMs: number,
): Promise<void> {
  const oldestPermitted = Date.now() - maxAgeMs;
  const entries = await readdir(cacheDirectory, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jpg'))
      .map(async (entry) => {
        const path = join(cacheDirectory, entry.name);
        const info = await stat(path).catch(() => undefined);
        if (info && info.mtimeMs < oldestPermitted)
          await unlink(path).catch(() => undefined);
      }),
  );
}
