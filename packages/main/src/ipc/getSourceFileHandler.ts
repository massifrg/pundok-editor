import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import { existsSync } from 'fs';
import { runExternalProgram } from '../runExternal';

export const getSourceFileHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      filename: string,
      page: number,
      rx: number,
      ry: number,
    ): Promise<void> => {
      console.log(`looking for source file corresponding to "${filename}", page ${page}, xy@${rx.toFixed(2)},${ry.toFixed(2)}%`)
      const synctexfile = filename.replace(/[.]pdf$/, '.synctex')
      if (!existsSync(synctexfile))
        return Promise.reject(`no synctex file found for "${filename}"`)

      // FIXME: get ConTeXt path from environment, configuration or project
      const ctxpath = '~/context/lmtx-latest/tex/texmf-linux-64/bin/'

      const pdfinfo = runExternalProgram(ctxpath + 'mtxrun',
        [
          "--script", "pdf",
          "--info", "--detail",
          filename
        ], {
        shell: true
      }
      )
      let result = await pdfinfo.result
      if (result.exitCode !== 0)
        return Promise.reject(`Error getting information about "${filename}": ${result.error}`)
      let pagewidth: number | undefined
      let pageheight: number | undefined
      const lines = result.output.split(/[\r\n]+/)
      console.log(lines)
      lines.forEach(line => {
        if (line.match(/mtx-pdf.*?mediabox/)) {
          console.log(line)
          line.replace(/pages:\s*(\d+)-(\d+),\s*width:\s*([0-9.]+),\s*height:\s*([0-9.]+)/, (_, f, l, w, h) => {
            const firstpage = parseInt(f)
            const lastpage = parseInt(l)
            if (page >= firstpage && page <= lastpage) {
              // FIXME: there's a bug in the ConTeXt script, that swaps width and height;
              // once it's fixed, the following two lines are the right ones.
              // pagewidth = parseFloat(w)
              // pageheight = parseFloat(h)
              pagewidth = parseFloat(h)
              pageheight = parseFloat(w)
            }
            return _
          })
        }
      })
      if (!pagewidth || !pageheight)
        return Promise.reject(`Error getting MediaBox of page ${page}`)
      console.log(`Page ${page} is ${pagewidth.toFixed(2)}x${pageheight.toFixed(2)} points`)
      const sourceinfo = runExternalProgram(ctxpath + 'mtxrun',
        [
          "--script", "synctex",
          "--goto", `--page=${page}`,
          `--x=${(pagewidth * rx).toFixed()}`,
          `--y=${(pageheight * ry).toFixed()}`,
          synctexfile
        ], {
        shell: true
      })
      result = await sourceinfo.result
      if (result.exitCode !== 0)
        return Promise.reject(`Error getting the source file for "${filename}", page ${page}: ${result.error}`)
      console.log(result.output)
      if (result.output.match(/filename=.*?linenumber=/)) {
        let sourcefile: string | undefined = undefined
        let sourceline: number | undefined = undefined
        result.output.replace(/filename='(.*?)'.*?linenumber='(\d+)'/, (_, fn, ln) => {
          sourcefile = fn
          sourceline = parseInt(ln)
          return _
        })
        if (sourcefile && sourceline) {

          // FIXME: remove next line and manage project
          sourcefile = (sourcefile as string).replace(/context\//, '')

          hub.fireEventOpenDocument(sourcefile, undefined, sourceline)
        }
      }
    }

