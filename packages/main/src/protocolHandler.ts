import { WebContentsView } from "electron";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { parse } from 'path';

export function handleImagesFor(view: WebContentsView) {
  view.webContents.session.protocol.handle('img', async (request) => {
    const url = request.url;
    console.log(request)
    const filepath = url.substring('img://'.length)
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
      }
      const imageBuffer = await readFile(filepath);
      const blob = new Blob([imageBuffer], { type: blobType })
      return new Response(blob, {
        status: 200,
        headers: { 'Content-Type': blob.type }
      });
    }
    return new Response(null, { status: 404 })
  })
}
