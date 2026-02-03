import { isAbsolute, normalize, parse as parsePath, resolve } from "path";
import { PundokEditorProject } from "../common";
import { isString } from "lodash-es";
import { pathToFileURL } from "url";

/**
 * Compute an absolute `file://` URL from a path that may be relative
 * (to the current project or the current working directory) or absolute,
 * or already a full blown URL.
 * @param path 
 * @param project 
 * @returns 
 */
export function pathToUrl(_path: string, project?: PundokEditorProject): URL | null {
  let url
  if (_path) {
    const path = _path.replace(/^file:\/\//, '')
    if (!isAbsolute(path)) {
      let absPath
      if (project) {
        if (project.rootDocument && isAbsolute(project.rootDocument))
          absPath = resolve(parsePath(project.rootDocument).dir, path);
        else
          absPath = resolve(project.path, path);
      } else {
        // no project, path is relative to process.cwd
        absPath = resolve(process.cwd(), path)
      }
      url = pathToFileURL(normalize(absPath))
    } else {
      // absolute path
      url = pathToFileURL(normalize(path))
    }
  }
  return url || null
}

/**
 * An URL split between pathname and file.
 */
export type BaseUrlWithFilename = {
  baseUrl: string,
  filename: string,
}

/**
 * Split an URL into a folder part and a file part.
 * @param filepath 
 * @param project 
 * @returns 
 */
export function baseUrlWithFilename(
  filepath: string | URL,
  project?: PundokEditorProject
): BaseUrlWithFilename | null {
  const fileUrl = isString(filepath) ? pathToUrl(filepath, project) : filepath
  if (fileUrl) {
    const chunks = fileUrl.pathname.split('/')
    const filename = chunks.pop()
    return filename
      ? { baseUrl: 'file://' + chunks.join('/'), filename }
      : null
  }
  return null
}