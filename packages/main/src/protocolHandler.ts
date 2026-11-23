import { WebContentsView } from 'electron';
import { existsSync } from 'fs';
import { access, readFile } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { parse, resolve } from 'path';
import { runExternalProgram } from './runExternal';
import { fileURLToPath } from 'url';
import { IMAGE_CACHE_MAX_AGE_MS } from './common';
import { userAppDataDir } from './resourcesManager';
import { loadCachedPdfImage } from './backend';

type BufferLoader = (
  filepath: string,
  params: Record<string, any>,
) => Promise<Buffer>;

export function handleImagesFor(view: WebContentsView) {
  view.webContents.session.protocol.handle('img', async (request) => {
    const url = new URL(request.url);
    let loader: BufferLoader | undefined = undefined;
    const filepath = fileURLToPath(new URL(`file://${url.pathname}`));
    if (existsSync(filepath)) {
      const { ext } = parse(filepath);
      let blobType: string | undefined = undefined;
      switch (ext.toLowerCase()) {
        case '.jpg':
        case '.jpeg':
          blobType = 'image/jpeg';
          break;
        case '.png':
          blobType = 'image/png';
          break;
        case '.svg':
          blobType = 'image/svg+xml';
          break;
        case '.pdf':
          loader = pdfToImage;
          // blobType = 'image/png'
          blobType = 'image/jpeg';
          break;
      }
      try {
        if (loader) await access(filepath, fsConstants.R_OK);
        const imagePage = loader
          ? parseImagePage(url.searchParams.get('page'))
          : 0;
        const imageBuffer = loader
          ? await loadCachedPdfImage(
              filepath,
              imagePage,
              resolve(userAppDataDir(), 'image-cache'),
              IMAGE_CACHE_MAX_AGE_MS,
              () => loader!(filepath, { page: String(imagePage) }),
            )
          : await readFile(filepath);
        // @ts-ignore
        const blob = new Blob([imageBuffer], { type: blobType });
        return new Response(blob, {
          status: 200,
          headers: { 'Content-Type': blob.type },
        });
      } catch (error) {
        const accessError =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          ['EACCES', 'ENOENT', 'EPERM'].includes(String(error.code));
        const missingRasterizer =
          loader && String(error).includes('ENOENT');
        const kind = missingRasterizer ? 'rasterization' : 'unreadable';
        return new Response(JSON.stringify({ error: String(error) }), {
          status: loader && !missingRasterizer &&
            (accessError || !existsSync(filepath) || !String(error).includes('ENOENT'))
            ? 404
            : loader
              ? 422
              : 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Pundok-Image-Error': kind,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        error: 'Unable to read the PDF file',
        kind: 'unreadable',
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'X-Pundok-Image-Error': 'unreadable',
        },
      },
    );
  });
}

function parseImagePage(page: string | null): number {
  const imagePage = page === null ? 0 : Number.parseInt(page, 10);
  if (!Number.isInteger(imagePage) || imagePage < 0)
    throw new Error('Invalid PDF page');
  return imagePage;
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
