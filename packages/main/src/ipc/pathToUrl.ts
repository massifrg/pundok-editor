import { isString } from "lodash-es";
import { platform } from "os";
import { isAbsolute, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { PundokEditorProject } from "../common";

/**
 * Like {@link pathToFileURL}, but
 * - it removes the starting "file://" when present
 * - in win32, it fixes the drive letter repetition: pathToFileURL('/C:/') === 'file:///C:/C:/'
 * @param _path 
 * @returns 
 */
export function pathToFileURLfixed(_path: string): URL {
  let path = _path
  if (path?.startsWith('file://'))
    path = path.replace(/^file:\/\//, '')
  // This is needed because pathToFileURL('/C:/') === 'file:///C:/C:/'
  if (platform() === 'win32' && path?.match(/^\/[A-Z]:/i))
    path = path.substring(1)
  return pathToFileURL(path)
}

export function toUnixPath(path: string): string {
  return platform() === 'win32'
    ? path.replaceAll('\\', '/')
    : path
}

export function pathToUrl(path: string, project?: PundokEditorProject): string {
  const base = project?.path || process.cwd()
  try {
    // Try parsing as URL
    const url = new URL(path);
    return url.toString();
  } catch {
    // Not a valid URL → treat as path
    const absolutePath = isAbsolute(path)
      ? path
      : resolve(base, path);
    return pathToFileURL(absolutePath).toString();
  }
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
    const chunks = fileURLToPath(fileUrl).split('/')
    const filename = chunks.pop()
    return filename
      ? { baseUrl: 'file://' + chunks.join('/'), filename }
      : null
  }
  return null
}