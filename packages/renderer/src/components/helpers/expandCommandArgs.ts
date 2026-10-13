import { parse, sep } from 'path-browserify';
import type { PundokEditorProject } from '../../common';

export function expandCommandArgs(
  args: string[],
  env?: { path?: string; project?: PundokEditorProject },
): string[] {
  if (!env) return args;
  const values: Record<string, string> = {};
  if (env.path) {
    const file = parse(env.path.replace(/^file:\/\//, ''));
    Object.assign(values, {
      BASE: file.base,
      DIR: file.dir,
      EXT: file.ext,
      NAME: file.name,
      ROOT: file.root,
      SEP: sep,
    });
  }
  if (env.project) {
    values.PROJECT_NAME = env.project.name;
    values.PROJECT_ROOT_DOC = env.project.rootDocument;
  }
  const keys = Object.keys(values);
  if (!keys.length) return args;
  const regex = new RegExp(`%(${keys.join('|')})%`, 'g');
  return args.map((arg) =>
    arg.replaceAll(regex, (_, key: string) => values[key] ?? key),
  );
}
