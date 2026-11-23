export function plainIpcValue<T>(value: T): T {
  return value === undefined
    ? value
    : (JSON.parse(JSON.stringify(value)) as T);
}
