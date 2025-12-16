import { parse, sep } from "path"

export function expandCommandArgs(args: string[], sourceFile?: string): string[] {
  if (!sourceFile)
    return args
  const file = parse(sourceFile)
  const part: Record<string, string> = {
    BASE: file.base,
    DIR: file.dir,
    EXT: file.ext,
    NAME: file.name,
    ROOT: file.root,
    SEP: sep
  }
  return args.map(arg => arg.replace(/%(BASE|DIR|EXT|NAME|ROOT|SEP)%/g,
    (_, key: string) => part[key])
  )
}