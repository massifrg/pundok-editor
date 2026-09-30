import { parse, sep } from "path"
import { localizePath } from './filesystem';
import { PundokEditorProject } from "./common";

/** 
 * An environment where looking for values to replace in
 * strings like %STRING% in command-line arguments
 */
interface CommandArgsEnvironment {
  /** The current source filename */
  path?: string,
  /** The current project */
  project?: PundokEditorProject,
}

/**
 * Expands expressions like `%NAME%`, `%BASE%` in the string array passed as first argument
 * with the corresponding elements of a path or a project passed as second argument.
 * Example:
 * ```
 * expandCommandArgs(["-o", "%NAME%.html"], { path: "source.json" }) => ["-o", "source.html"]
 * expandCommandArgs(["-o", "%PROJECT%.html"], { path: "source.json" }) => ["-o", "source.html"]
 * ```
 * The expressions that are replaced (example: "/home/user/myfile.md"):
 * - `%BASE%`: "myfile.md"
 * - `%DIR%`:  "/home/user"
 * - `%EXT%`:  "md"
 * - `%NAME%`: "myfile"
 * - `%ROOT%`: "/"
 * - `%SEP%`:  "/"
 * @param args Usually the arguments passed to an external program.
 * @param env The environment from which picking every %VALUE% within percent signs.
 * @returns string[] The arguments with the replacement of %VALUE% elements.
 */
export function expandCommandArgs(
  args: string[],
  env?: CommandArgsEnvironment,
): string[] {
  if (!env)
    return args
  const { path, project } = env
  let part: Record<string, string> = {}
  if (path) {
    const file = parse(localizePath(path))
    part = {
      ...part,
      BASE: file.base,
      DIR: file.dir,
      EXT: file.ext,
      NAME: file.name,
      ROOT: file.root,
      SEP: sep,
    }
  }
  if (project) {
    part = {
      ...part,
      PROJECT_NAME: project?.name,
      PROJECT_ROOT_DOC: project?.rootDocument,
    }
  }
  const regex = new RegExp('%(' + Object.keys(part).join('|') + ')%', 'g')
  console.log(regex)
  return args.map(arg => arg.replaceAll(regex, (_, key: string) => part[key] || key))
}