export function nextCopyName(
  name: string,
  existingNames: Iterable<string>,
): string {
  const names = new Set(existingNames);
  let suffix = 1;
  let copy = `${name}${suffix}`;
  while (names.has(copy)) {
    suffix += 1;
    copy = `${name}${suffix}`;
  }
  return copy;
}
