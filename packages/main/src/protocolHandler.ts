import { WebContentsView } from "electron";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { parse } from 'path';
import { runExternalProgram } from "./runExternal";
import { fileURLToPath } from "url";

type BufferLoader = (filepath: string, params: Record<string, any>) => Promise<Buffer>

export function handleImagesFor(view: WebContentsView) {
  view.webContents.session.protocol.handle('img', async (request) => {
    const url_string = request.url;
    const url = new URL(url_string)
    let loader: BufferLoader | undefined = undefined
    console.log(request)
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
        ? await loader(filepath, { ...url.searchParams, mimeType: blobType })
        : await readFile(filepath);
      // @ts-ignore
      const blob = new Blob([imageBuffer], { type: blobType })
      return new Response(blob, {
        status: 200,
        headers: { 'Content-Type': blob.type }
      });
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
        `-density ${dpi}`,
        `${filepath}[${page}]`,
        "-background", "white",
        "-alpha", "remove",
        "-alpha", "off",
        "jpg:-"
      ],
      {
        shell: true,
      },
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
