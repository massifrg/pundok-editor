import { isString } from 'lodash';
import { parse as parsePath, resolve } from 'path';

/**
 * Transform any type into a string.
 * @param s The value or object to be stringified.
 * @returns 
 */
export function stringify(s: any): string {
  return isString(s) ? s : JSON.stringify(s);
}

/**
 * Enclose a string in straight quotes, escaping quotes already present in the string.
 * @param s The string to be enclosed in quotes.
 * @returns 
 */
export function encloseInDblQuotes(s: string): string {
  return s ? `"${s.replace('"', '\\"')}"` : s;
}

/**
 * Change the extension of a file.
 * @param filename The original filename.
 * @param new_ext The new extension.
 * @returns 
 */
export function replaceFileExtension(filename: string, new_ext: string): string {
  const parsed = parsePath(filename)
  return resolve(parsed.dir, `${parsed.name}.${new_ext}`)
}