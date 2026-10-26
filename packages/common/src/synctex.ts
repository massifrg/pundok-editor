export const SYNCTEX_CONTEXT_REQUIRED = 'synctex-context-required';

export interface SynctexInfo {
  outputFile: string,
  page: number,
  rx: number,
  ry: number,
  projectAsJson?: string,
}