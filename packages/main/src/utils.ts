import { isString } from 'lodash';

export function stringify(s: any): string {
  return isString(s) ? s : JSON.stringify(s);
}

export function encloseInDblQuotes(s: string): string {
  return s ? `"${s.replace('"', '\\"')}"` : s;
}
