import type { RenderingBookmark } from './bookmarks';

export const SYNCTEX_CONTEXT_REQUIRED = 'synctex-context-required';

export interface SynctexInfo {
  outputFile: string,
  page: number,
  rx: number,
  ry: number,
  projectAsJson?: string,
  sourceDocumentPath?: string,
}

export interface PdfRectangle {
  llx: number;
  lly: number;
  urx: number;
  ury: number;
}

export interface PdfPageRectangle extends PdfRectangle {
  page: number;
  pageHeight?: number;
}

export interface PdfLocation extends PdfRectangle {
  bookmark: RenderingBookmark;
  page: number;
  pageHeight?: number;
  rectangles: PdfPageRectangle[];
}