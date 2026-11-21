import type { PundokEditorProject } from '../../common';
import {
  documentPathBaseName,
  documentPathDirName,
  documentPathRoot,
  normalizeDocumentPath,
} from '../../common';

export function expandCommandArgs(
  args: string[],
  env?: { path?: string; project?: PundokEditorProject },
): string[] {
  if (!env) return args;
  const values: Record<string, string> = {};
  if (env.path) {
    const file = normalizeDocumentPath(env.path);
    const base = documentPathBaseName(file);
    const dot = base.lastIndexOf('.');
    const name = dot <= 0 ? base : base.slice(0, dot);
    const ext = dot <= 0 ? '' : base.slice(dot);
    const dir = documentPathDirName(file);
    const root = documentPathRoot(file);
    Object.assign(values, {
      BASE: base,
      DIR: dir,
      EXT: ext,
      NAME: name,
      ROOT: root,
      SEP: '/',
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
