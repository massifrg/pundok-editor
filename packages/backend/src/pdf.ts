import { localizePath } from './filesystem';
import { runExternalProgram } from './runExternal';
import type { ExternalProgramResult, PdfPageCount } from '../../common/src';

export async function getPdfPageCount(filename: string): Promise<PdfPageCount> {
  const path = localizePath(filename);
  let mtxrun: ExternalProgramResult;
  try {
    mtxrun = await runExternalProgram(
      'mtxrun',
      ['--script', 'pdf', '--info', '--detail', path],
    ).result;
  } catch (error) {
    mtxrun = {
      exitCode: -1,
      output: '',
      error: externalErrorMessage(error),
      commandLine: 'mtxrun',
      cwd: process.cwd(),
    };
  }
  const pageRanges = [...mtxrun.output.matchAll(
    /mtx-pdf.*?mediabox.*?pages:\s*(\d+)-(\d+)/g,
  )];
  const mtxrunPageCount = pageRanges.reduce(
    (count, [, , last]) => Math.max(count, Number.parseInt(last, 10)),
    0,
  );
  if (mtxrun.exitCode === 0 && mtxrunPageCount > 0) {
    return {
      pageCount: mtxrunPageCount,
      usedImageMagick: false,
    };
  }

  const imageMagick = await runExternalProgram(
    'magick',
    ['identify', '-format', '%p\n', path],
  ).result;
  if (imageMagick.exitCode !== 0)
    throw new Error(
      imageMagick.error ||
        mtxrun.error ||
        'Unable to inspect PDF pages with mtxrun or ImageMagick',
    );

  const pages = imageMagick.output
    .trim()
    .split(/\s+/)
    .map((page) => Number.parseInt(page, 10))
    .filter((page) => Number.isInteger(page));
  const pageCount = pages.length;
  if (pageCount < 1) throw new Error('Unable to determine PDF page count');
  return { pageCount, usedImageMagick: true };
}

function externalErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'error' in error)
    return String(error.error);
  return String(error);
}
