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
import { extname, join } from 'node:path';
import { runExternalProgram } from '../../backend/src';

export const IMAGE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const MIME_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

export async function loadImage(
  path: string,
  page: string | undefined,
  cacheDirectory?: string,
): Promise<{ body: Buffer; contentType: string }> {
  if (extname(path).toLowerCase() === '.pdf') {
    return {
      body: cacheDirectory
        ? await loadCachedPdfImage(path, page, cacheDirectory)
        : await pdfToJpeg(path, page),
      contentType: 'image/jpeg',
    };
  }

  const contentType = MIME_TYPES[extname(path).toLowerCase()];
  if (!contentType) throw new Error('Unsupported image format');
  return { body: await readFile(path), contentType };
}

type PdfRenderer = (path: string, page?: string) => Promise<Buffer>;

export async function loadCachedPdfImage(
  path: string,
  page: string | undefined,
  cacheDirectory: string,
  renderPdf: PdfRenderer = pdfToJpeg,
): Promise<Buffer> {
  const imagePage = parsePage(page);
  await mkdir(cacheDirectory, { recursive: true });
  await removeExpiredImages(cacheDirectory);

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

  const image = await renderPdf(path, page);
  const temporaryPath = `${cachedPath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, image);
  await rename(temporaryPath, cachedPath);
  return image;
}

async function removeExpiredImages(cacheDirectory: string): Promise<void> {
  const oldestPermitted = Date.now() - IMAGE_CACHE_MAX_AGE_MS;
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

async function pdfToJpeg(path: string, page?: string): Promise<Buffer> {
  const imagePage = parsePage(page);

  const chunks: Buffer[] = [];
  const { result } = runExternalProgram(
    'magick',
    [
      '-density',
      '150',
      `${path}[${imagePage}]`,
      '-background',
      'white',
      '-alpha',
      'remove',
      '-alpha',
      'off',
      'jpg:-',
    ],
    undefined,
    (source, chunk) => {
      if (source === 'out') chunks.push(chunk as Buffer);
    },
  );
  const { exitCode, error } = await result;
  if (exitCode !== 0) throw new Error(error || 'Unable to rasterize PDF image');
  return Buffer.concat(chunks);
}

function parsePage(page: string | undefined): number {
  const imagePage = page === undefined ? 0 : Number.parseInt(page, 10);
  if (!Number.isInteger(imagePage) || imagePage < 0)
    throw new Error('Invalid PDF page');
  return imagePage;
}
