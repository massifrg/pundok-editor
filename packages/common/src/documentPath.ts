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
  let normalized = path;
  if (/^file:\/\/\//i.test(normalized)) {
    normalized = normalized.slice('file://'.length);
  } else if (/^file:\/\//i.test(normalized)) {
    const authorityAndPath = normalized.slice('file://'.length);
    if (/^[a-z]:/i.test(authorityAndPath))
      normalized = authorityAndPath;
    else
      normalized = `//${authorityAndPath}`;
  }

  normalized = decodePath(normalized).replaceAll('\\', '/');

  if (/^[a-z]:/i.test(normalized))
    normalized = normalized.replace(/^([a-z]):/i, (_, drive: string) =>
      `${drive.toUpperCase()}:`,
    );
  if (/^\/[a-z]:\//i.test(normalized))
    normalized = normalized.slice(1);

  normalized = normalized.replace(/\/+$/, '');
  if (/^[a-z]:$/i.test(normalized)) return normalized;
  if (normalized === '/') return '/';
  if (normalized.startsWith('//'))
    return `//${normalized.replace(/^\/+/, '').replace(/\/+/g, '/').replace(/\/+$/, '')}`;
  return normalized.replace(/\/+/g, '/');
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
  if (/^[a-z]:\//i.test(normalized))
    return `file:///${encodeURI(normalized).replaceAll('#', '%23').replaceAll('?', '%3F')}`;
  if (normalized.startsWith('//'))
    return `file://${encodeURI(normalized.slice(2)).replaceAll('#', '%23').replaceAll('?', '%3F')}`;
  return `file://${encodeURI(normalized.startsWith('/') ? normalized : `/${normalized}`).replaceAll('#', '%23').replaceAll('?', '%3F')}`;
}

export function documentPathFromFileUrl(url: string): string {
  if (!/^file:/i.test(url)) return normalizeDocumentPath(url);
  if (/^file:\/\/[^/]/i.test(url)) {
    const authorityAndPath = url.replace(/^file:\/\/+/i, '');
    if (/^[a-z]:/i.test(authorityAndPath))
      return normalizeDocumentPath(authorityAndPath);
    return normalizeDocumentPath(`//${authorityAndPath}`);
  }
  return normalizeDocumentPath(url.replace(/^file:\/\/\/?/i, '/'));
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
  if (/^\/\/[^/]+\/[^/]+$/.test(normalized))
    return normalized;
  return normalized.slice(0, separator);
}

export function joinDocumentPath(base: string, child: string): string {
  const normalizedBase = normalizeDocumentPath(base);
  let normalizedChild = normalizeDocumentPath(child);
  if (
    normalizedChild.startsWith('/') ||
    /^[a-z]:\//i.test(normalizedChild)
  )
    return normalizedChild;
  if (!normalizedBase) return normalizedChild;
  return normalizeDocumentPath(
    `${normalizedBase.replace(/\/+$/, '')}/${normalizedChild.replace(/^\/+/, '')}`,
  );
}

export function resolveDocumentPath(base: string, path: string): string {
  const normalizedBase = normalizeDocumentPath(base);
  const normalizedPath = normalizeDocumentPath(path);
  if (
    normalizedPath.startsWith('/') ||
    /^[/]{2}/.test(normalizedPath) ||
    /^[a-z]:\//i.test(normalizedPath)
  )
    return normalizedPath;

  const combined = joinDocumentPath(normalizedBase, normalizedPath);
  const prefix = /^[a-z]:\//i.test(combined)
    ? `${combined.slice(0, 3)}`
    : combined.startsWith('//')
      ? '//'
      : combined.startsWith('/')
        ? '/'
        : '';
  const remainder = prefix
    ? combined.slice(prefix === '//' ? 2 : prefix.length)
    : combined;
  const segments: string[] = [];
  for (const segment of remainder.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  if (prefix === '//') return `//${segments.join('/')}`;
  if (prefix === '/') return `/${segments.join('/')}`;
  if (prefix) return `${prefix}${segments.join('/')}`;
  return segments.join('/');
}

export function documentPathsEqual(first: string, second: string): boolean {
  const normalizedFirst = normalizeDocumentPath(first);
  const normalizedSecond = normalizeDocumentPath(second);
  const windows = /^[a-z]:\//i.test(normalizedFirst) ||
    /^[a-z]:\//i.test(normalizedSecond) ||
    normalizedFirst.startsWith('//') ||
    normalizedSecond.startsWith('//');
  return windows
    ? normalizedFirst.toLowerCase() === normalizedSecond.toLowerCase()
    : normalizedFirst === normalizedSecond;
}
