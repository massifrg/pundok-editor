import { isProxy, toRaw } from 'vue';

export function deproxify(a: any): any {
  const raw = isProxy(a) ? toRaw(a) : a;
  if (typeof raw === 'object') {
    for (let p in raw) raw[p] = deproxify(raw[p]);
  }
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length; i++) raw[i] = deproxify(raw[i]);
  }
  return raw;
}
