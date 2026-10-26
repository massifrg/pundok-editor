import { WebContentsView } from "electron";
import { createHash, randomUUID } from 'crypto';
import { existsSync } from "fs";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "fs/promises";
import { join, parse, resolve } from 'path';
import { runExternalProgram } from "./runExternal";
import { fileURLToPath } from "url";
import { IMAGE_CACHE_MAX_AGE_MS } from './common';
import { userAppDataDir } from './resourcesManager';

type BufferLoader = (filepath: string, params: Record<string, any>) => Promise<Buffer>

export function handleImagesFor(view: WebContentsView) {
  view.webContents.session.protocol.handle('img', async (request) => {
    const url_string = request.url;
    const url = new URL(url_string)
    let loader: BufferLoader | undefined = undefined
    const filepath = fileURLToPath(url_string.replace(/^img:\/\//, 'file://'))
    if (existsSync(filepath)) {
      const { ext } = parse(filepath)
      let blobType: string | undefined = undefined
      switch (ext.toLowerCase()) {
        case '.jpg':
        case '.jpeg':
          blobType = 'image/jpeg'
          break
        case '.png':
          blobType = 'image/png'
          break
        case '.svg':
          blobType = 'image/svg+xml'
          break
        case '.pdf':
          loader = pdfToImage
          // blobType = 'image/png'
          blobType = 'image/jpeg'
          break
      }
      const imageBuffer = loader
        ? await loadCachedPdfImage(filepath, url.searchParams.get('page'), loader)
        : await readFile(filepath);
      // @ts-ignore
      const blob = new Blob([imageBuffer], { type: blobType })
      return new Response(blob, {
        status: 200,
        headers: { 'Content-Type': blob.type }
      });
    }

    async function loadCachedPdfImage(
      filepath: string,
      page: string | null,
      render: BufferLoader,
    ): Promise<Buffer> {
      const imagePage = page === null ? 0 : Number.parseInt(page, 10);
      if (!Number.isInteger(imagePage) || imagePage < 0)
        throw new Error('Invalid PDF page');

      const cacheDirectory = resolve(userAppDataDir(), 'image-cache');
      await mkdir(cacheDirectory, { recursive: true });
      await removeExpiredImages(cacheDirectory);
      const cachedPath = join(
        cacheDirectory,
        `${createHash('sha256').update(filepath).digest('hex')}-${imagePage}.jpg`,
      );
      const [pdfInfo, cachedInfo] = await Promise.all([
        stat(filepath),
        stat(cachedPath).catch(() => undefined),
      ]);
      if (cachedInfo && pdfInfo.mtimeMs <= cachedInfo.mtimeMs)
        return readFile(cachedPath);

      const image = await render(filepath, { page: String(imagePage) });
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
    return new Response(null, { status: 404 })
  })
}

/**
 * Render a PDF on a PNG image (see `https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/pdf2png.mjs`).
 * @param filepath
 * @param params 
 * @returns 
 */
async function pdfToImage(filepath: string, params: Record<string, any>): Promise<Buffer> {
  const dpi = 150
  const page = params?.page || 0
  try {
    const chunks: Buffer[] = []
    const spawned = runExternalProgram("magick",
      [
        "-density", String(dpi),
        `${filepath}[${page}]`,
        "-background", "white",
        "-alpha", "remove",
        "-alpha", "off",
        "jpg:-"
      ],
      undefined,
      (source, chunk) => {
        if (source === 'out') chunks.push(chunk)
      }
    )
    const result = await spawned.result
    const { exitCode, error } = result
    if (exitCode === 0) {
      return Buffer.concat(chunks)
    } else {
      console.log(error)
      return Promise.reject(error)
    }
  } catch (reason) {
    console.log(reason);
    return Promise.reject(reason)
  }
}
