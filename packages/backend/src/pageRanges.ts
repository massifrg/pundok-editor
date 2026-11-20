import { readFile } from 'node:fs/promises';
import type { ProjectComponent } from '../../common/src';
import { withPageRangesFromSynctex } from '../../common/src';
import { localizePath } from './filesystem';
import { runExternalProgram } from './runExternal';

/**
 * Populates project components with the PDF page ranges found in SyncTeX
 * output.
 */
export function populatePageRangesFromSynctex(
  structure: ProjectComponent,
  synctexOutput: string,
  projectPath?: string,
): ProjectComponent {
  return withPageRangesFromSynctex(structure, synctexOutput, projectPath);
}

/**
 * Reads a SyncTeX file and populates project components with its page ranges.
 */
export async function populatePageRangesFromSynctexFile(
  structure: ProjectComponent,
  synctexFile: string,
  projectPath?: string,
): Promise<ProjectComponent> {
  const synctexOutput = await readFile(synctexFile, 'utf8');
  return populatePageRangesFromSynctex(
    structure,
    synctexOutput,
    projectPath,
  );
}

/**
 * Returns the human-readable SyncTeX listing produced by mtxrun.
 */
export async function listSynctexFile(synctexFile: string): Promise<string> {
  const result = await runExternalProgram(
    'mtxrun',
    ['--script', 'synctex', '--list', localizePath(synctexFile)],
  ).result;
  if (result.exitCode !== 0)
    throw new Error(result.error || `Unable to list SyncTeX file: ${synctexFile}`);
  return `${result.output}\n${result.error}`;
}
