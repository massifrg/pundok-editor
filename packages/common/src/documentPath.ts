export type DocumentLocationKind = 'file' | 'url';

export interface DocumentLocation {
  kind: DocumentLocationKind;
  value: string;
}

function decodePath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeDocumentPath(path: string): string {
  let normalized = /^file:/i.test(path) ? fileUrlPath(path) : decodePath(path);
  normalized = normalized.replaceAll('\\', '/');

  if (/^[a-z]:/i.test(normalized))
    normalized = normalized.replace(
      /^([a-z]):/i,
      (_, drive: string) => `${drive.toUpperCase()}:`,
    );
  if (/^\/[a-z]:\//i.test(normalized)) normalized = normalized.slice(1);

  normalized = normalized.replace(/\/+$/, '');
  if (/^[a-z]:$/i.test(normalized)) return normalized;
  if (normalized === '/') return '/';
  if (normalized.startsWith('//'))
    return `//${normalized.replace(/^\/+/, '').replace(/\/+/g, '/').replace(/\/+$/, '')}`;
  return normalized.replace(/\/+/g, '/');
}

function fileUrlPath(url: string): string {
  const value = url.replace(/^file:/i, '');
  if (value.startsWith('//')) {
    const withoutSlashes = value.slice(2);
    if (withoutSlashes.startsWith('/')) {
      const localPath = decodePath(withoutSlashes);
      return /^[\\/][a-z]:/i.test(localPath) ? localPath.slice(1) : localPath;
    }
    const authorityAndPath = decodePath(withoutSlashes);
    if (/^[a-z]:\//i.test(authorityAndPath)) return authorityAndPath;
    if (authorityAndPath.startsWith('/')) return authorityAndPath;
    if (/^localhost\//i.test(authorityAndPath))
      return `/${authorityAndPath.slice('localhost/'.length)}`;
    return `//${authorityAndPath}`;
  }
  return decodePath(value);
}

export function documentLocation(pathOrUrl: string): DocumentLocation {
  const value = pathOrUrl.trim();
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(value) &&
    !/^file:/i.test(value) &&
    !/^[a-z]:[\\/]/i.test(value)
  )
    return { kind: 'url', value };
  return { kind: 'file', value: normalizeDocumentPath(value) };
}

export function documentPathToFileUrl(path: string): string {
  const normalized = normalizeDocumentPath(path);
  const encoded = normalized
    .split('/')
    .map((segment) =>
      encodeURIComponent(segment)
        .replaceAll('%3A', ':')
        .replace(
          /[!'()*]/g,
          (character) =>
            `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
        ),
    )
    .join('/');
  if (/^[a-z]:\//i.test(normalized)) return `file:///${encoded}`;
  if (normalized.startsWith('//')) return `file://${encoded.slice(2)}`;
  return `file://${encoded.startsWith('/') ? encoded : `/${encoded}`}`;
}

export function documentPathFromFileUrl(url: string): string {
  if (!/^file:/i.test(url)) return normalizeDocumentPath(url);
  return normalizeDocumentPath(url);
}

export function documentPathBaseName(path: string): string {
  const normalized = normalizeDocumentPath(path);
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

export function documentPathDirName(path: string): string {
  const normalized = normalizeDocumentPath(path);
  if (/^[a-z]:[\\/]?$/i.test(normalized)) return `${normalized}/`;
  const separator = normalized.lastIndexOf('/');
  if (separator < 0) return '';
  if (separator === 0) return '/';
  if (/^\/\/[^/]+\/[^/]+$/.test(normalized)) return normalized;
  return normalized.slice(0, separator);
}

export function joinDocumentPath(base: string, child: string): string {
  const normalizedBase = normalizeDocumentPath(base);
  let normalizedChild = normalizeDocumentPath(child);
  if (normalizedChild.startsWith('/') || /^[a-z]:\//i.test(normalizedChild))
    return normalizedChild;
  if (!normalizedBase) return normalizedChild;
  return normalizeDocumentPath(
    `${normalizedBase.replace(/\/+$/, '')}/${normalizedChild.replace(/^\/+/, '')}`,
  );
}

export function isDocumentPathAbsolute(path: string): boolean {
  const normalized = normalizeDocumentPath(path);
  return normalized.startsWith('/') || /^[a-z]:\//i.test(normalized);
}

export function documentPathRoot(path: string): string {
  const normalized = normalizeDocumentPath(path);
  if (/^[a-z]:\//i.test(normalized)) return `${normalized.slice(0, 2)}/`;
  if (normalized.startsWith('//')) {
    const segments = normalized.slice(2).split('/');
    return segments.length >= 2
      ? `//${segments.slice(0, 2).join('/')}/`
      : `${normalized}/`;
  }
  return normalized.startsWith('/') ? '/' : '';
}

export function resolveDocumentPath(base: string, path: string): string {
  const normalizedBase = normalizeDocumentPath(base);
  const normalizedPath = normalizeDocumentPath(path);
  if (isDocumentPathAbsolute(normalizedPath)) return normalizedPath;

  const combined = joinDocumentPath(normalizedBase, normalizedPath);
  const root = documentPathRoot(combined);
  const remainder = root ? combined.slice(root.length) : combined;
  const segments: string[] = [];
  for (const segment of remainder.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  if (root) return normalizeDocumentPath(`${root}${segments.join('/')}`);
  return segments.join('/');
}

export function resolveDocumentContextPath(
  path: string,
  projectPath?: string,
): string {
  const normalized = normalizeDocumentPath(path);
  return projectPath && !isDocumentPathAbsolute(normalized)
    ? resolveDocumentPath(projectPath, normalized)
    : normalized;
}

export function relativeDocumentPath(from: string, to: string): string {
  const normalizedFrom = normalizeDocumentPath(from);
  const normalizedTo = normalizeDocumentPath(to);
  const fromRoot = documentPathRoot(normalizedFrom);
  const toRoot = documentPathRoot(normalizedTo);
  const windows =
    /^[a-z]:\//i.test(fromRoot) ||
    /^[a-z]:\//i.test(toRoot) ||
    fromRoot.startsWith('//') ||
    toRoot.startsWith('//');
  const sameRoot = windows
    ? fromRoot.toLowerCase() === toRoot.toLowerCase()
    : fromRoot === toRoot;
  if (!sameRoot) return normalizedTo;

  const fromParts = normalizedFrom
    .slice(fromRoot.length)
    .split('/')
    .filter(Boolean);
  const toParts = normalizedTo.slice(toRoot.length).split('/').filter(Boolean);
  let common = 0;
  while (
    common < fromParts.length &&
    common < toParts.length &&
    (windows
      ? fromParts[common].toLowerCase() === toParts[common].toLowerCase()
      : fromParts[common] === toParts[common])
  )
    common++;
  return [
    ...fromParts.slice(common).map(() => '..'),
    ...toParts.slice(common),
  ].join('/');
}

export function documentPathsEqual(first: string, second: string): boolean {
  const normalizedFirst = normalizeDocumentPath(first);
  const normalizedSecond = normalizeDocumentPath(second);
  const windows =
    /^[a-z]:\//i.test(normalizedFirst) ||
    /^[a-z]:\//i.test(normalizedSecond) ||
    normalizedFirst.startsWith('//') ||
    normalizedSecond.startsWith('//');
  return windows
    ? normalizedFirst.toLowerCase() === normalizedSecond.toLowerCase()
    : normalizedFirst === normalizedSecond;
}
