function normalizedFilePath(path: string): string {
  return path
    .replace(/^file:\/\//, '')
    .replaceAll('\\', '/')
    .replace(/\/+$/, '');
}

export function filePathsEqual(first: string, second: string): boolean {
  const normalizedFirst = normalizedFilePath(first);
  const normalizedSecond = normalizedFilePath(second);
  const isWindowsPath =
    /^[a-z]:\//i.test(normalizedFirst) ||
    /^[a-z]:\//i.test(normalizedSecond) ||
    normalizedFirst.startsWith('//') ||
    normalizedSecond.startsWith('//');

  return isWindowsPath
    ? normalizedFirst.toLowerCase() === normalizedSecond.toLowerCase()
    : normalizedFirst === normalizedSecond;
}

export function filePathBaseName(path: string): string {
  const normalized = normalizedFilePath(path);
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

export function filePathDirName(path: string): string {
  const normalized = normalizedFilePath(path);
  const separator = normalized.lastIndexOf('/');
  return separator < 0 ? '' : normalized.slice(0, separator);
}

export function filePathWithChild(path: string, child: string): string {
  return `${normalizedFilePath(path)}/${child}`;
}
