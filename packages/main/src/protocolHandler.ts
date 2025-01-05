import { WebContentsView } from "electron";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { parse } from 'path';
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

type BufferLoader = (filepath: string, params: Record<string, any>) => Promise<Buffer>

export function handleImagesFor(view: WebContentsView) {
  view.webContents.session.protocol.handle('img', async (request) => {
    const url_string = request.url;
    const url = new URL(url_string)
    let loader: BufferLoader | undefined = undefined
    console.log(request)
    const filepath = url_string.substring('img://'.length)
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
        ? await loader(filepath, { ...url.searchParams, mimeType: blobType })
        : await readFile(filepath);
      const blob = new Blob([imageBuffer], { type: blobType })
      return new Response(blob, {
        status: 200,
        headers: { 'Content-Type': blob.type }
      });
    }
    return new Response(null, { status: 404 })
  })
}

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()


/**
 * Render a PDF on a PNG image (see `https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/pdf2png.mjs`).
 * @param filepath
 * @param params 
 * @returns 
 */
async function pdfToImage(filepath: string, params: Record<string, any>): Promise<Buffer> {
  try {
    const content = await readFile(filepath)
    const loadingTask = getDocument({
      data: new Uint8Array(content),
    })
    const pdfDocument = await loadingTask.promise;
    // Get the first page.
    const page = await pdfDocument.getPage(1);
    // Render the page on a Node canvas with 100% scale.
    const canvasFactory = pdfDocument.canvasFactory;
    const viewport = page.getViewport({ scale: 1.0 });
    /** @ts-ignore-error */
    const canvasAndContext = canvasFactory.create(
      viewport.width,
      viewport.height
    );
    const renderContext = {
      canvasContext: canvasAndContext.context,
      viewport,
    };
    await page.render(renderContext).promise
    // Convert the canvas to an image buffer.
    const image = canvasAndContext.canvas.toBuffer(params.mimeType || "image/jpeg");
    // Release page resources.
    page.cleanup();
    return image
  } catch (reason) {
    console.log(reason);
    return Promise.reject(reason)
  }
}
