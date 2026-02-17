import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import { existsSync } from '../filesystem';
import { runExternalProgram } from '../runExternal';
import {
  EditorKeyType,
  PundokEditorProject,
  SynctexInfo
} from '../common';
import { isAbsolute, resolve } from 'path';
import { progressFeedback } from './feedback';
import { getExtendedEnvironment } from '../resourcesManager';

export const getSourceFileHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      editorKey: EditorKeyType,
      info: SynctexInfo,
    ): Promise<void> => {
      const { outputFile: filename, page, rx, ry, projectAsJson } = info
      let msg = `looking for source file corresponding to "${filename}", page ${page}, xy@${rx.toFixed(2)},${ry.toFixed(2)}%`
      console.log(msg)
      progressFeedback(hub, "err", msg, editorKey)
      const synctexfile = filename.replace(/[.]pdf$/, '.synctex')
      progressFeedback(hub, "err", `synctex file: ${synctexfile}`, editorKey)

      try {
        if (!existsSync(synctexfile)) {
          const errMsg = `no synctex file found for "${filename}"`
          console.log(errMsg)
          return Promise.reject(errMsg)
        }
        const env = await getExtendedEnvironment()
        const pdfinfo = runExternalProgram(
          'mtxrun',
          [
            "--script", "pdf",
            "--info", "--detail",
            filename
          ],
          {
            // shell: true,
            env
          }
        )
        let result = await pdfinfo.result
        if (result.exitCode !== 0) {
          const errMsg = `Error getting information about "${filename}": ${result.error}`
          console.log(errMsg)
          progressFeedback(hub, "err", errMsg, editorKey)
          return Promise.reject(errMsg)
        }
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
        if (!pagewidth || !pageheight) {
          const errMsg = `Error getting MediaBox of page ${page}`
          console.log(errMsg)
          return Promise.reject(errMsg)
        }
        console.log(`Page ${page} is ${pagewidth.toFixed(2)}x${pageheight.toFixed(2)} points`)
        const sourceinfo = runExternalProgram(
          'mtxrun',
          [
            "--script", "synctex",
            "--goto", `--page=${page}`,
            `--x=${(pagewidth * rx).toFixed()}`,
            `--y=${(pageheight * ry).toFixed()}`,
            synctexfile
          ],
          {
            // shell: true,
            env
          }
        )
        result = await sourceinfo.result
        if (result.exitCode !== 0) {
          const errMsg = `Error getting the source file for "${filename}", page ${page}: ${result.error}`
          console.log(errMsg)
          progressFeedback(hub, "err", errMsg, editorKey)
          return Promise.reject(errMsg)
        }
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
            if (!isAbsolute(sourcefile) && projectAsJson) {
              const project: PundokEditorProject = JSON.parse(projectAsJson)
              if (project && project.path)
                sourcefile = resolve(project.path, sourcefile)
            }
            console.log(`SOURCE FILE: ${sourcefile}`)
            hub.fireEventOpenDocument({
              path: sourcefile,
              atLine: sourceline
            })
          }
        }
      } catch (err) {
        const errMsg = JSON.stringify(err)
        console.log(errMsg)
        return Promise.reject(errMsg)
      }
    }

