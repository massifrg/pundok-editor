import { parse, sep } from "path"
import { localizePath } from "../filesystem"

/**
 * Expands expressions like `%NAME%`, `%BASE%` in the string array passed as first argument
 * with the corresponding parts of a path passed as second argument. Example:
 * ```
 * expandCommandArgs(["-o", "%NAME%.html"], "source.json") => ["-o", "source.html"]
 * ```
 * The expressions that are replaced (example: "/home/user/myfile.md"):
 * - `%BASE%`: "myfile.md"
 * - `%DIR%`:  "/home/user"
 * - `%EXT%`:  "md"
 * - `%NAME%`: "myfile"
 * - `%ROOT%`: "/"
 * - `%SEP%`:  "/"
 * @param args Usually the arguments passed to an external program.
 * @param sourceFile The path of a file.
 * @returns 
 */
export function expandCommandArgs(args: string[], sourceFile?: string): string[] {
  if (!sourceFile)
    return args
  const file = parse(localizePath(sourceFile))
  const part: Record<string, string> = {
    BASE: file.base,
    DIR: file.dir,
    EXT: file.ext,
    NAME: file.name,
    ROOT: file.root,
    SEP: sep
  }
  const regex = new RegExp('%' + Object.keys(part).join('!') + '%')
  return args.map(arg => arg.replaceAll(regex, (_, key: string) => part[key]))
}